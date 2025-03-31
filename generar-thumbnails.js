const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Ruta de tus plantillas
    const rutas = [
        'file:///C:/Users/lenovo/qbit/Plantillas/plantilla1.html',
        'file:///C:/Users/lenovo/qbit/Plantillas/plantilla2.html',
        'file:///C:/Users/lenovo/qbit/Plantillas/plantilla3.html',
        'file:///C:/Users/lenovo/qbit/Plantillas/plantilla4.html'
    ];

    for (let i = 0; i < rutas.length; i++) {
        await page.goto(rutas[i]);
        await page.screenshot({ path: `Plantillas/thumbnail${i + 1}.jpg`, fullPage: true });
    }

    await browser.close();
})();
