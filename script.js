// Função para adicionar e remover combinados
document.getElementById("combinados").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        let valor = this.value.trim();
        if (valor !== "") {
            let lista = document.getElementById("combinadosLista");
            if (!lista) {
                // Criar a lista se não existir dentro do mesmo div do input
                lista = document.createElement("ul");
                lista.id = "combinadosLista";
                lista.className = "mt-2 list-unstyled"; // Adicionei list-unstyled para remover o estilo padrão de lista do Bootstrap
                this.parentNode.appendChild(lista);
            }

            let item = document.createElement("li");
            item.className = "combinado-item"; // Classe para estilização flex

            let itemText = document.createElement("span");
            itemText.textContent = "• " + valor;

            let removeBtn = document.createElement("button");
            removeBtn.innerHTML = "&times;"; // Ícone 'x' para remover
            removeBtn.className = "remove-combinado"; // Classe para estilização do botão
            removeBtn.title = "Remover combinado";
            removeBtn.onclick = function() {
                item.remove(); // Remove o item da lista
                if (lista.children.length === 0) {
                    lista.remove(); // Remove a lista inteira se não houver mais itens
                }
            };

            item.appendChild(itemText);
            item.appendChild(removeBtn);
            lista.appendChild(item);
            this.value = ""; // Limpa o campo de input
        }
    }
});

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

    // Coletar combinados (itens da lista)
    const combinadosLista = document.getElementById('combinadosLista');
    let combinados = [];
    if (combinadosLista) {
        combinados = Array.from(combinadosLista.children)
            .map(li => li.querySelector('span').textContent.replace('• ', '')); // Pega o texto do span
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

    // Informações básicas
    doc.setFontSize(12);
    contentStartY += 10; // Adiciona espaço após o título do plano alimentar

    // NOME (ESQUERDA)
    doc.text(`Nome: ${formData.nome}`, contentStartX, contentStartY);

    // DATA (DIREITA, NA MESMA LINHA DO NOME)
    const dataLabel = 'Data: ';
    const dataText = `${dataLabel}${displayDate}`;
    const dataTextWidth = doc.getTextWidth(dataText);
    const dataX = pageWidth - dataTextWidth - contentStartX; // Calcula a posição X para alinhar à direita (pageWidth - largura_texto - margem_direita)
    doc.text(dataText, dataX, contentStartY); // Adiciona a data alinhada à direita

    contentStartY += 8; // Agora sim, move para a próxima linha após o Nome e Data

    // Adicionar combinados ao PDF
    if (combinados.length > 0) {
        contentStartY += 8; // Espaço antes de "Combinados"
        doc.text('Combinados:', contentStartX, contentStartY);
        let y = contentStartY + 8;
        // Define a largura máxima para o texto dos combinados
        const textWidthForCombinados = pageWidth - contentStartX - 20; // contentStartX (margem esquerda) + 20 (margem direita aproximada)

        for (const item of combinados) { // Use for...of to handle await if needed inside (though not strictly necessary here)
            // Split the text into lines that fit the defined width
            const lines = doc.splitTextToSize(`• ${item}`, textWidthForCombinados);

            for (const line of lines) {
                // Check if a new page is needed for the current line of the combined item
                if (y + 8 > doc.internal.pageSize.getHeight() - 20) { // -20 for bottom margin
                    doc.addPage();
                    await addBackgroundToPage(doc); // Add background to the new page
                    y = 40; // Start at the top of the new page, adjusted for background2.png
                }
                doc.text(line, contentStartX + 6, y); // Align the bullet slightly to the right
                y += 8;
            }
        }
        contentStartY = y + 8; // Add a margin after the combinados
    } else {
        contentStartY += 8; // Add a margin if there are no combinados
    }

    // Função auxiliar para adicionar refeições com formatação
    async function addFormattedMeal(doc, title, content, currentY, startX) {
        // Verifica se precisa de uma nova página
        // 30 é uma estimativa de altura para o título e as primeiras linhas
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

    // Limpar formulário (opcional)
    document.getElementById('planoForm').reset();
    // Remover itens da lista de combinados
    const combinadosListaRemover = document.getElementById('combinadosLista');
    if (combinadosListaRemover) {
        combinadosListaRemover.remove();
    }
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
