// A função de adicionar/remover combinados via keypress foi removida
// pois o campo combinados se tornou um textarea normal.

async function gerarPDF() {
    // Coletar dados do formulário
    const formData = {
        nome: document.getElementById('nome').value,
        data: document.getElementById('data').value,
        cafeManha: document.getElementById('cafeManha').value,
        intervaloManha: document.getElementById('intervaloManha').value,
        almoco: document.getElementById('almoco').value,
        intervaloTarde: document.getElementById('intervaloTarde').value,
        jantar: document.getElementById('jantar').value
    };

    // Formatar a data para o PDF (DD/MM/YYYY)
    let displayDate = formData.data;
    if (formData.data) {
        try {
            const [year, month, day] = formData.data.split('-');
            displayDate = `${day}/${month}/${year}`;
        } catch (e) {
            console.warn("Erro ao formatar data, usando formato original.", e);
            // Se houver erro, usa a data como está
        }
    }

    // Coletar combinados (itens do textarea, separados por linha)
    const combinadosTextarea = document.getElementById('combinados');
    let combinados = [];
    if (combinadosTextarea && combinadosTextarea.value.trim() !== "") {
        // Divide o texto por quebras de linha e filtra linhas vazias
        combinados = combinadosTextarea.value.split('\n')
                                            .map(line => line.trim())
                                            .filter(line => line !== "");
    }

    // Validar campos obrigatórios
    if (!formData.nome || !formData.data || !formData.cafeManha || !formData.almoco || !formData.jantar) {
        alert('Por favor, preencha todos os campos obrigatórios!');
        return;
    }

    // Criar PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Tamanho da página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Função para adicionar o background (será chamada em cada página)
    const addBackgroundToPage = async (doc) => {
        const pageNumber = doc.internal.getNumberOfPages();
        let backgroundImageUrl = 'background.png'; // Padrão para a primeira página

        if (pageNumber > 1) { // Para a segunda página em diante
            backgroundImageUrl = 'background2.png';
        }

        try {
            const backgroundImg = await loadImage(backgroundImageUrl);
            doc.addImage(backgroundImg, 'PNG', 0, 0, pageWidth, pageHeight);
        } catch (e) {
            console.warn(`Imagem de fundo '${backgroundImageUrl}' não encontrada ou erro ao carregar. Continuando sem ela.`, e);
        }
    };

    // --- ADICIONAR IMAGEM DE FUNDO NA PRIMEIRA PÁGINA ---
    await addBackgroundToPage(doc);
    // --- FIM DA IMAGEM DE FUNDO ---

    let contentStartX = 14; // Margem X inicial para o conteúdo
    let contentStartY = 45; // Posição Y inicial para o conteúdo (ajustado para o background da primeira página)

    // Adicionar logo (agora ajustado para ficar entre o título e as informações de nome/data)
    try {
        const logoImg = await loadImage('Plano alimentar (1).png'); // Verifique se o nome do arquivo está correto
        const logoWidth = 40; // Largura da logo em mm
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width; // Mantém proporção
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight); // Posição Y ajustada para 10
    } catch (e) {
        console.log("Logo 'Plano alimentar (1).png' não encontrada, continuando sem ela...", e);
    }
    
     
    // Informações básicas
    doc.setFontSize(12);
    contentStartY += 10; // Adiciona espaço após o título do plano alimentar
    
    // NOME (ESQUERDA)
    doc.setFont(undefined, 'bold');
    doc.text(`Nome: ${formData.nome}`, contentStartX, contentStartY);
    
    // DATA (DIREITA, NA MESMA LINHA DO NOME)
    const dataLabel = 'Data: ';
    const dataText = `${dataLabel}${displayDate}`;
    const dataTextWidth = doc.getTextWidth(dataText);
    const dataX = pageWidth - dataTextWidth - contentStartX; // Calcula a posição X para alinhar à direita (pageWidth - largura_texto - margem_direita) 
    doc.text(dataText, dataX, contentStartY); // Adiciona a data alinhada à direita
    
    contentStartY += 8; // Agora sim, move para a próxima linha após o Nome e Data
    doc.setFont(undefined, 'normal'); // Volta a fonte para normal após o nome em negrito

    // Adicionar combinados ao PDF
    if (combinados.length > 0) {
        contentStartY += 8; // Espaço antes de "Combinados"
        doc.setFont(undefined, 'bold'); // Combinados em negrito
        doc.text('Combinados:', contentStartX, contentStartY);
        doc.setFont(undefined, 'normal'); // Volta a fonte para normal
        let y = contentStartY + 8;
        combinados.forEach(item => {
            doc.text(`• ${item}`, contentStartX + 6, y); // Alinha o bullet um pouco para a direita
            y += 8;
        });
        contentStartY = y + 8; // Adiciona uma margem após os combinados
    } else {
        contentStartY += 8; // Adiciona uma margem caso não haja combinados
    }

    // Função auxiliar para adicionar refeições com formatação
    async function addFormattedMeal(doc, title, content, currentY, startX) {
        // Verifica se precisa de uma nova página
        if (currentY + 30 > doc.internal.pageSize.getHeight() - 20) { // -20 para considerar margem inferior
            doc.addPage();
            await addBackgroundToPage(doc); // Adiciona o background (background2.png nas páginas seguintes)
            
            // ATENÇÃO: Ajuste este valor (40) para alinhar o conteúdo com seu background2.png
            currentY = 40; // Começa no topo da nova página, ajustado para o background2.png
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, startX, currentY);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        
        // Quebra o texto para caber na página (pageWidth - startX - margem_direita)
        const textWidth = pageWidth - startX - 10; // Ex: 10mm de margem direita
        const lines = doc.splitTextToSize(content, textWidth); 
        let y = currentY + 8;
        
        for (const line of lines) { // Usar for...of para poder usar await dentro do loop
            // Verifica se precisa de uma nova página para a linha atual
            if (y + 8 > doc.internal.pageSize.getHeight() - 20) { // -20 para considerar margem inferior
                doc.addPage();
                await addBackgroundToPage(doc); // Adiciona o background (background2.png) na nova página
                
                // ATENÇÃO: Ajuste este valor (40) para alinhar o conteúdo com seu background2.png
                y = 40; // Começa no topo da nova página, ajustado
            }

            // Verifica se é um título de opção (ex: "Opção 1:") e formata em negrito
            if (line.match(/^Opção\s\d+:/i)) {
                doc.setFont(undefined, 'bold');
                doc.text(line, startX + 6, y); // Alinha com o bullet
                doc.setFont(undefined, 'normal'); // Volta ao normal para o restante do texto
            } else {
                doc.text(line, startX + 6, y); // Alinha com o bullet
            }
            y += 8;
        }
        
        return y + 8; // Retorna a nova posição Y para o próximo bloco
    }

    // Adicionar refeições formatadas (usando await nas chamadas)
    contentStartY = await addFormattedMeal(doc, 'Café da Manhã:', formData.cafeManha, contentStartY, contentStartX);
    if (formData.intervaloManha) {
        contentStartY = await addFormattedMeal(doc, 'Intervalo da Manhã:', formData.intervaloManha, contentStartY, contentStartX);
    }
    contentStartY = await addFormattedMeal(doc, 'Almoço:', formData.almoco, contentStartY, contentStartX);
    if (formData.intervaloTarde) {
        contentStartY = await addFormattedMeal(doc, 'Intervalo da Tarde:', formData.intervaloTarde, contentStartY, contentStartX);
    }
    contentStartY = await addFormattedMeal(doc, 'Jantar:', formData.jantar, contentStartY, contentStartX);

    // Salvar PDF
    doc.save(`Plano Alimentar - ${formData.nome}.pdf`);

    // Não limpa mais o formulário automaticamente
}

// Nova função para limpar o formulário
function limparFormulario() {
    document.getElementById('planoForm').reset();
}

// Função auxiliar para carregar imagens
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Erro ao carregar imagem: ${url}`);
            reject(new Error(`Falha ao carregar imagem: ${url}`));
        };
        img.src = url;
    });
}