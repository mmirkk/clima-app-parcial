const detailsContent = document.getElementById("details-content");
const loader = document.getElementById("loader");
const body = document.body;
const apiKey = "94c71e9494ca2e24e67e492d7cd4546c";

const initDetailsPage = () => {
    const params = new URLSearchParams(window.location.search);
    const cityId = params.get("id");
    if (!cityId) {
        showError("No se ha especificado una ciudad.");
        return;
    }
    fetchAndDisplayDetails(cityId);
};

const fetchAndDisplayDetails = async (cityId) => {
    loader.style.display = "block";
    detailsContent.innerHTML = "";
    try {
        const currentWeatherData = await getWeatherDataById(cityId);
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?id=${cityId}&appid=${apiKey}&units=metric&lang=es`;
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error("No se pudo obtener el pronóstico.");
        const forecastData = await forecastResponse.json();

        const backgroundClass = getWeatherBackgroundClass(currentWeatherData.weather[0].main);
        body.className = `bg-details ${backgroundClass}`;
        setTimeout(() => body.classList.add("ready"), 100);

        renderDetails(currentWeatherData, forecastData);

        const insight = getWeatherInsight(currentWeatherData);
        const aiSuggestionEl = document.getElementById("ai-suggestion");
        if (aiSuggestionEl) {
            aiSuggestionEl.innerHTML = `<p>${insight}</p>`;
        }
    } catch (error) {
        showError(error.message);
    } finally {
        loader.style.display = "none";
    }
};

const getWeatherDataById = async (cityId) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?id=${cityId}&appid=${apiKey}&units=metric&lang=es`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudieron obtener los detalles (Código: ${response.status})`);
    return response.json();
};

const getWeatherInsight = (weatherData) => {
    const temp = Math.round(weatherData.main.temp);
    const description = weatherData.weather[0].description.toLowerCase();
    const condition = weatherData.weather[0].main.toLowerCase();
    const windSpeed = weatherData.wind.speed;

    if (condition.includes("thunderstorm")) {
        return "¡Se viene la tormenta! Mejor quedarse en casa con unos buenos mates. Acordate de desenchufar todo por las dudas.";
    }
    if (condition.includes("snow")) {
        return "¡A sacar los guantes y la bufanda! Un día ideal para ver la nieve caer con algo calentito en la mano.";
    }
    if (
        condition.includes("rain") ||
        condition.includes("drizzle") ||
        description.includes("lluvia") ||
        description.includes("llovizna")
    ) {
        return "¡Si salís, no te olvides el paraguas! Es un día perfecto para unas torta fritas y maratón de series.";
    }
    if (condition.includes("fog") || condition.includes("mist")) {
        return "Hay niebla, che. Andá con cuidado si manejás o caminás por la calle. ¡Parece Silent Hill!";
    }
    if (temp > 30) {
        return "¡Hacen treinta grados a la sombra! Es un día para la pileta, el río o el aire acondicionado a full. ¡Tomá mucha agua!";
    }
    if (temp > 22 && condition.includes("clear")) {
        return "¡Un día espectacular! El clima está ideal para disfrutar al aire libre. Unos mates en la plaza o una birra con amigos van como piña.";
    }
    if (temp < 5) {
        return "¡Que frío che! Si tenés que salir, ponete de todo: camperón, bufanda, guantes. ¡Hoy se queda adentro!";
    }
    if (temp < 12) {
        return "¡Hace un frío bárbaro! Asegurate de usar un buen abrigo si vas a estar mucho tiempo afuera. Ideal para un buen guiso.";
    }
    if (windSpeed > 30) {
        return `Ojo que se levantó un viento terrible de ${Math.round(windSpeed)} km/h. ¡Agarrá bien todo que se vuela!`;
    }
    if (temp >= 12 && temp <= 18) {
        return "El famoso 'clima engañoso'. Fresquito, ideal para una campera de jean o un buzo. No te confíes que a la sombra se pone fresco.";
    }
    if (condition.includes("clouds")) {
        return "Está todo nublado, un día gris pero ideal para hacer trámites o adelantar cosas en casa sin sentir que te perdés el sol.";
    }
    return "El clima de hoy es ideal para cualquier plan que tengas en mente. ¡Disfruta del día!";
};

const renderDetails = (current, forecast) => {
    const { name, sys, weather, main } = current;
    const forecastList = forecast.list;
    const formatTime = (unix) =>
        new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const getDayOfWeek = (unix) =>
        new Date(unix * 1000).toLocaleDateString("es-ES", { weekday: "long" });

    const dailyData = {};
    forecastList.forEach((item) => {
        const day = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyData[day]) {
            dailyData[day] = { temps: [], weathers: [], dt: item.dt };
        }
        dailyData[day].temps.push(item.main.temp);
        dailyData[day].weathers.push(item.weather[0]);
    });

    const processedDaily = Object.values(dailyData).map((day) => {
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        const mainWeather = day.weathers[Math.floor(day.weathers.length / 2)];
        return { dt: day.dt, temp: { max: maxTemp, min: minTemp }, weather: [mainWeather] };
    });

    detailsContent.innerHTML = `
        <div class="current-weather-panel">
            <div class="main-weather-info">
                <h1>${name}, ${sys.country}</h1>
                <div class="current-main-info">
                    <img src="https://openweathermap.org/img/wn/${weather[0].icon}@4x.png" alt="Icono del clima">
                    <p class="current-temp">${Math.round(main.temp)}°C</p>
                    <p class="current-desc">${weather[0].description}</p>
                    <p class="current-range">Max: ${Math.round(processedDaily[0].temp.max)}°C &nbsp;&nbsp; Min: ${Math.round(
        processedDaily[0].temp.min
    )}°C</p>
                </div>
            </div>
            <div class="ai-panel">
                <h4>Consejo del Día</h4>
                <div id="ai-suggestion">
                    <div class="mini-loader"></div>
                    <p>Generando consejo...</p>
                </div>
            </div>
        </div>
        <div class="forecast-panel">
            <h3>Pronóstico próximas horas</h3>
            <div class="hourly-forecast">
                ${forecastList
                    .slice(0, 8)
                    .map(
                        (hour) => `
                    <div class="hour-item">
                        <span>${formatTime(hour.dt)}</span>
                        <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}.png" alt="${hour.weather[0].description}">
                        <strong>${Math.round(hour.main.temp)}°C</strong>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
        <div class="forecast-panel">
            <h3>Pronóstico para 5 Días</h3>
            <div class="daily-forecast">
                ${processedDaily
                    .slice(0, 5)
                    .map(
                        (day) => `
                    <div class="day-item">
                        <span class="day-name">${getDayOfWeek(day.dt)}</span>
                        <div class="day-icon-temp">
                            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                            <span>${day.weather[0].main}</span>
                        </div>
                        <div class="day-range">
                            <strong>${day.temp.max}°</strong> / ${day.temp.min}°
                        </div>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
    `;
};

const getWeatherBackgroundClass = (weatherMain) => {
    const condition = weatherMain.toLowerCase();
    switch (condition) {
        case "clear":
            return "bg-clear";
        case "clouds":
            return "bg-clouds";
        case "rain":
            return "bg-rain";
        case "drizzle":
            return "bg-drizzle";
        case "thunderstorm":
            return "bg-thunderstorm";
        case "snow":
            return "bg-snow";
        default:
            return "bg-default";
    }
};

const showError = (message) => {
    detailsContent.innerHTML = `<p class="error-message">${message}</p>`;
};

initDetailsPage();