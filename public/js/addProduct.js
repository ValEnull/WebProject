document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');

    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function() {
            // Pulisci l'anteprima precedente
            imagePreview.innerHTML = '';
            
            // Verifica quante immagini sono state selezionate
            if (this.files.length > 5) {
                alert('Puoi caricare al massimo 5 immagini');
                this.value = '';
                return;
            }
            
            // Mostra anteprima per ogni immagine
            Array.from(this.files).forEach((file, index) => {
                if (!file.type.startsWith('image/')) return;
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'image-preview-item';
                    
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Anteprima">
                        <button type="button" class="remove-btn" data-index="${index}">×</button>
                    `;
                    
                    imagePreview.appendChild(previewItem);
                    
                    // Aggiungi evento per rimuovere l'immagine
                    previewItem.querySelector('.remove-btn').addEventListener('click', function() {
                        removeImage(index);
                        previewItem.remove();
                    });
                }
                
                reader.readAsDataURL(file);
            });
        });
    }

    function removeImage(index) {
        const dt = new DataTransfer();
        const { files } = imageInput;
        
        for (let i = 0; i < files.length; i++) {
            if (i !== index) dt.items.add(files[i]);
        }
        
        imageInput.files = dt.files;
    }
});