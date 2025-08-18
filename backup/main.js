async function includeHTML() {
    let z, i, elmnt, file, xhttp;
    /*loop through a collection of all HTML elements:*/
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
      elmnt = z[i];
      /*search for elements with a certain atrribute:*/
      file = elmnt.getAttribute("w3-include-html");
      if (file) {
        /*make an HTTP request using the attribute value as the file name:*/
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4) {
            if (this.status == 200) {elmnt.innerHTML = this.responseText;}
            if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
            /*remove the attribute, and call this function once more:*/
            elmnt.removeAttribute("w3-include-html");
            includeHTML();
          }
        }
        xhttp.open("GET", file, true);
        xhttp.send();
        /*exit the function:*/
        return;
      }
    }
  }
  
  includeHTML();
  
  document.addEventListener('DOMContentLoaded', () => {
      const tabsContainers = document.querySelectorAll('.tab-container');
  
      tabsContainers.forEach(container => {
          const tabLinks = container.querySelectorAll('.tab-link');
          const tabPanes = container.querySelectorAll('.tab-pane');
  
          tabLinks.forEach(link => {
              link.addEventListener('click', (e) => {
                  e.preventDefault();
  
                  const targetId = link.dataset.tabTarget;
                  const targetPane = document.querySelector(targetId);
  
                  // Deactivate all tab links and panes in this container
                  tabLinks.forEach(l => l.classList.remove('active'));
                  tabPanes.forEach(p => p.classList.remove('active'));
  
                  // Activate the clicked tab link and its corresponding pane
                  link.classList.add('active');
                  if (targetPane) {
                      targetPane.classList.add('active');
                  }
              });
          });
  
          // Set initial active tab if none is specified
          if (!container.querySelector('.tab-link.active') && tabLinks.length > 0) {
              tabLinks[0].classList.add('active');
              const initialPane = document.querySelector(tabLinks[0].dataset.tabTarget);
              if (initialPane) {
                  initialPane.classList.add('active');
              }
          }
      });
  });
  