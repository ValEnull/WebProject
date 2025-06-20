document.addEventListener('DOMContentLoaded', function() {
    // Dati di esempio
    const products = [
        {
            id: "PRD-001",
            name: "Piatto decorato a mano",
            image: "/img/piattoApi.jpeg",
            quantity: 15,
            price: 24.99,
            status: "active"
        },
        {
            id: "PRD-002",
            name: "Fermaporta a forma di pollo",
            image: "/img/fermaPortaPolli.jpg",
            quantity: 8,
            price: 12.50,
            status: "active"
        },
        {
            id: "PRD-003",
            name: "Opera in metallo riciclato",
            image: "/img/operaMetallo.png",
            quantity: 3,
            price: 45.00,
            status: "low-stock"
        },
        {
            id: "PRD-004",
            name: "Vaso artigianale",
            image: "/img/placeholderProduct.png",
            quantity: 0,
            price: 32.99,
            status: "inactive"
        },
        {
            id: "PRD-005",
            name: "Porta candele",
            image: "/img/placeholderProduct.png",
            quantity: 22,
            price: 18.75,
            status: "active"
        }
    ];

    const stats = [
        {
            title: "Prodotti totali",
            value: products.length
        },
        {
            title: "Disponibili",
            value: products.filter(p => p.status === "active").length
        },
        {
            title: "Esauriti",
            value: products.filter(p => p.quantity === 0).length
        },
        {
            title: "In esaurimento",
            value: products.filter(p => p.status === "low-stock").length
        }
    ];

    // Carica le statistiche
    function loadStats() {
        const statsContainer = document.querySelector('.stats-container');
        statsContainer.innerHTML = '';
        
        stats.forEach(stat => {
            const statCol = document.createElement('div');
            statCol.className = 'col-md-3 mb-3';
            statCol.innerHTML = `
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body text-center">
                        <h5 class="text-muted mb-2">${stat.title}</h5>
                        <h2 class="text-orange">${stat.value}</h2>
                    </div>
                </div>
            `;
            statsContainer.appendChild(statCol);
        });
    }

    // Carica i prodotti nella tabella
function loadProducts() {
    const productsBody = document.querySelector('.products-body');
    productsBody.innerHTML = '';
    
    products.forEach(product => {
        const statusClass = `bg-${product.status}`;
        const statusText = {
            'active': 'Disponibile',
            'inactive': 'Non disponibile',
            'low-stock': 'Esaurimento'
        }[product.status];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${product.image}" alt="${product.name}" class="product-table-img"></td>
            <td>${product.name}</td>
            <td>${product.id}</td>
            <td>${product.quantity}</td>
            <td>€${product.price.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <a href="editProduct.html?id=${product.id}" class="btn btn-sm btn-outline-orange" title="Modifica prodotto">
                    <i class="fas fa-edit"></i>
                </a>
            </td>
        `;
        productsBody.appendChild(row);
    });
    
    updatePagination(products.length);
}

    // Aggiorna la paginazione
    function updatePagination(totalItems) {
        const paginationContainer = document.querySelector('.pagination-container');
        paginationContainer.innerHTML = `
            <div>
                <p class="mb-0 text-muted">Mostrati 1-${Math.min(5, totalItems)} di ${totalItems} prodotti</p>
            </div>
            <ul class="pagination mb-0">
                <li class="page-item disabled">
                    <a class="page-link" href="#" tabindex="-1">Precedente</a>
                </li>
                <li class="page-item active"><a class="page-link" href="#">1</a></li>
                ${totalItems > 5 ? `<li class="page-item"><a class="page-link" href="#">2</a></li>` : ''}
                ${totalItems > 10 ? `<li class="page-item"><a class="page-link" href="#">3</a></li>` : ''}
                <li class="page-item ${totalItems <= 5 ? 'disabled' : ''}">
                    <a class="page-link" href="#">Successivo</a>
                </li>
            </ul>
        `;
    }

    // Inizializza tutto
    function init() {
        loadStats();
        loadProducts();
    }

    init();
});