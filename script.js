document.getElementById("combinadosInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        let valor = this.value.trim();
        if (valor !== "") {
            let lista = document.getElementById("combinadosLista");
            let item = document.createElement("li");
            item.textContent = "• " + valor;
            lista.appendChild(item);
            this.value = "";
        }
    }
});