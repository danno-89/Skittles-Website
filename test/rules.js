document.addEventListener('DOMContentLoaded', () => {
    const details = document.querySelectorAll('.rules-section');

    details.forEach(detail => {
        detail.addEventListener('toggle', function(e) {
            if (this.open) {
                // Optional: Close other sections when one is opened
                details.forEach(otherDetail => {
                    if (otherDetail !== this) {
                        otherDetail.open = false;
                    }
                });
            }
        });
    });
});
