document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('changePasswordForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validazione lato client
        if (newPassword.length < 7) {
            alert('La password deve contenere almeno 7 caratteri!');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('Le password non corrispondono!');
            return;
        }
    });
});