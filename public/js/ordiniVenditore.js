document.addEventListener('DOMContentLoaded', function() {
    // Dati di esempio semplificati
    const orders = [
        {id: "SC-2025-00158", date: "25/06/2025", customer: "Mario Rossi", amount: 149.99, status: "processing"},
        {id: "SC-2025-00157", date: "24/06/2025", customer: "Luigi Bianchi", amount: 89.50, status: "shipped"},
        {id: "SC-2025-00156", date: "23/06/2025", customer: "Giovanni Verdi", amount: 199.99, status: "completed"},
        {id: "SC-2025-00155", date: "22/06/2025", customer: "Anna Neri", amount: 75.25, status: "disputed"},
        {id: "SC-2025-00154", date: "21/06/2025", customer: "Paolo Gialli", amount: 120.00, status: "processing"},
        {id: "SC-2025-00153", date: "20/06/2025", customer: "Francesca Viola", amount: 65.99, status: "completed"},
        {id: "SC-2025-00152", date: "19/06/2025", customer: "Marco Blu", amount: 210.50, status: "shipped"},
        {id: "SC-2025-00151", date: "18/06/2025", customer: "Elena Rosa", amount: 45.00, status: "completed"}
    ];

    const stats = [
        {title: "Ordini totali", value: orders.length},
        {title: "In elaborazione", value: orders.filter(o => o.status === "processing").length},
        {title: "In spedizione", value: orders.filter(o => o.status === "shipped").length},
        {title: "Completati", value: orders.filter(o => o.status === "completed").length}
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

    // Carica gli ordini
    function loadOrders(filter = 'all') {
        const ordersBody = document.querySelector('.orders-body');
        ordersBody.innerHTML = '';
        
        const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);
        
        filteredOrders.forEach(order => {
            const statusClass = `bg-${order.status}`;
            const statusText = {
                'processing': 'In elaborazione',
                'shipped': 'In spedizione',
                'completed': 'Completato',
                'disputed': 'In controversia'
            }[order.status];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.date}</td>
                <td>${order.customer}</td>
                <td>€${order.amount.toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            `;
            ordersBody.appendChild(row);
        });
        
        updatePagination(filteredOrders.length);
    }

    // Filtra gli ordini
    function setupStatusFilter() {
        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.filter-option').forEach(opt => 
                    opt.classList.remove('active'));
                this.classList.add('active');
                loadOrders(this.dataset.status);
            });
        });
    }

    // Inizializza tutto
    function init() {
        loadStats();
        loadOrders();
        setupStatusFilter();
    }

    init();
});