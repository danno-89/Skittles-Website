document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            const target = document.querySelector(`#${tab.dataset.tab}`);
            tabContents.forEach(content => content.classList.remove('active'));
            target.classList.add('active');
        });
    });
});
