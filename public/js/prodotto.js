class ProductPage {
    constructor() {
        this.reviews = [];
        this.currentRating = 0;
        this.init();
    }

    init() {
        this.setupImageGallery();
        this.setupQuantitySelector();
        this.setupReviewSystem();
    }

    /* Image Gallery */
    setupImageGallery() {
        const thumbnails = document.querySelectorAll('.img-thumbnail');
        const mainImage = document.getElementById('mainProductImage');
        
        // Set first image as default
        if (thumbnails.length > 0) {
            this.changeMainImage(thumbnails[0]);
            thumbnails[0].classList.add('active', 'border-primary');
        }
        
        // Add click events
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                this.changeMainImage(thumb);
                this.updateActiveThumbnail(thumb);
            });
        });
    }

    changeMainImage(element) {
        document.getElementById('mainProductImage').src = element.src;
    }

    updateActiveThumbnail(activeThumb) {
        document.querySelectorAll('.img-thumbnail').forEach(thumb => {
            thumb.classList.remove('active', 'border-primary');
        });
        activeThumb.classList.add('active', 'border-primary');
    }

    /* Quantity Selector */
    setupQuantitySelector() {
        document.getElementById('increment')?.addEventListener('click', this.incrementQuantity.bind(this));
        document.getElementById('decrement')?.addEventListener('click', this.decrementQuantity.bind(this));
    }

    incrementQuantity() {
        const quantityInput = document.getElementById('quantity');
        quantityInput.value = parseInt(quantityInput.value) + 1;
    }

    decrementQuantity() {
        const quantityInput = document.getElementById('quantity');
        if (parseInt(quantityInput.value) > 1) {
            quantityInput.value = parseInt(quantityInput.value) - 1;
        }
    }

    /* Review System */
    setupReviewSystem() {
        this.loadReviews();
        this.setupStarRating();
        this.setupReviewForm();
        this.displayReviews();
        this.updateProductRating();
    }

    setupStarRating() {
        const starsContainer = document.querySelector('.star-rating');
        if (!starsContainer) return;
        
        // Create stars dynamically
        starsContainer.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = 'far fa-star';
            star.dataset.rating = i;
            starsContainer.appendChild(star);
            
            star.addEventListener('mouseover', () => this.highlightStars(i));
            star.addEventListener('mouseout', () => this.highlightStars(this.currentRating));
            star.addEventListener('click', () => this.setRating(i));
        }
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('fas', 'active');
                star.classList.remove('far');
            } else {
                star.classList.add('far');
                star.classList.remove('fas', 'active');
            }
        });
    }

    setRating(rating) {
        this.currentRating = rating;
        document.getElementById('rating-value').value = rating;
    }

    setupReviewForm() {
        const form = document.getElementById('review-form');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitReview();
        });
    }

    submitReview() {
        const rating = parseInt(document.getElementById('rating-value').value);
        const text = document.getElementById('review-text').value.trim();
        
        if (!rating) {
            alert('Seleziona una valutazione');
            return;
        }
        
        if (!text) {
            alert('Scrivi una recensione');
            return;
        }
        
        const newReview = {
            rating,
            text,
            author: 'Utente', // Sostituire con nome reale in produzione
            date: new Date().toLocaleDateString('it-IT')
        };
        
        this.addReview(newReview);
        document.getElementById('review-form').reset();
        this.currentRating = 0;
        this.highlightStars(0);
    }

    addReview(review) {
        this.reviews.push(review);
        this.saveReviews();
        this.displayReviews();
        this.updateProductRating();
    }

    loadReviews() {
        const savedReviews = localStorage.getItem('productReviews');
        this.reviews = savedReviews ? JSON.parse(savedReviews) : [];
    }

    saveReviews() {
        localStorage.setItem('productReviews', JSON.stringify(this.reviews));
    }

    displayReviews() {
        const container = document.getElementById('reviews-container');
        const noReviewsMsg = document.getElementById('no-reviews-message');
        
        if (this.reviews.length === 0) {
            noReviewsMsg.style.display = 'block';
            container.innerHTML = '<p id="no-reviews-message">Nessuna recensione ancora. Sii il primo!</p>';
            return;
        }
        
        noReviewsMsg.style.display = 'none';
        container.innerHTML = this.reviews.map(review => this.createReviewHTML(review)).join('');
    }

    createReviewHTML(review) {
        return `
            <div class="review-card">
                <div class="d-flex justify-content-between">
                    <div>
                        <span class="review-author">${review.author}</span>
                        <div class="text-warning mb-2">
                            ${'<i class="fas fa-star"></i>'.repeat(review.rating)}
                            ${'<i class="far fa-star"></i>'.repeat(5 - review.rating)}
                        </div>
                    </div>
                    <span class="review-date">${review.date}</span>
                </div>
                <p>${review.text}</p>
            </div>
        `;
    }

    updateProductRating() {
        const starsContainer = document.querySelector('.stars-container');
        const reviewsCount = document.querySelector('.reviews-count');
        
        if (!starsContainer || !reviewsCount) return;
        
        if (this.reviews.length === 0) {
            starsContainer.innerHTML = `
                <i class="far fa-star"></i>
                <i class="far fa-star"></i>
                <i class="far fa-star"></i>
                <i class="far fa-star"></i>
                <i class="far fa-star"></i>
            `;
            reviewsCount.textContent = '(0 recensioni)';
            return;
        }
        
        const avgRating = this.reviews.reduce((sum, review) => sum + review.rating, 0) / this.reviews.length;
        const fullStars = Math.floor(avgRating);
        const hasHalfStar = avgRating % 1 >= 0.5;
        
        starsContainer.innerHTML = `
            ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
            ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
            ${'<i class="far fa-star"></i>'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}
        `;
        
        reviewsCount.textContent = `(${this.reviews.length} recension${this.reviews.length === 1 ? 'e' : 'i'})`;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => new ProductPage());