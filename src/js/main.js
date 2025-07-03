import Sortable from "sortablejs";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const locationsGrid = document.getElementById("locationsGrid");
const heroSection = document.getElementById("hero-section");
const loader = document.getElementById("loader");
const weatherFilter = document.getElementById("weatherFilter");
const mapPinIcon = document.getElementById("map-pin-icon");
const mapModal = document.getElementById("map-modal");
const closeMapBtn = document.getElementById("close-map-btn");
const mapContainer = document.getElementById("map");
const alertButton = document.getElementById("alertButton");

const apiKey = "94c71e9494ca2e24e67e492d7cd4546c";
const STORAGE_KEY = "weatherDashboardLocations";
let savedLocations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentFilter = "all";
let map = null;

const init = () => {
    document.body.classList.add("preload");
    setTimeout(() => {
        document.body.classList.remove("preload");
    }, 100);

    const uniqueIds = new Set();
    const cleanLocations = savedLocations.filter((location) => {
        if (location.id && !uniqueIds.has(location.id)) {
            uniqueIds.add(location.id);
            return true;
        }
        return false;
    });
    if (cleanLocations.length < savedLocations.length) {
        savedLocations = cleanLocations;
        saveToStorage();
    }

    searchForm.addEventListener("submit", handleSearch);
    locationsGrid.addEventListener("click", handleCardActions);
    heroSection.addEventListener("click", handleHeroCardActions);
    weatherFilter.addEventListener("change", handleFilterChange);
    mapPinIcon.addEventListener("click", openMapModal);
    closeMapBtn.addEventListener("click", closeMapModal);
    mapModal.addEventListener("click", (e) => {
        if (e.target === mapModal) closeMapModal();
    });

    if (alertButton) {
        alertButton.addEventListener("click", handleAlertClick);
    }

    if (savedLocations.length === 0) {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                addLocationByCoords(coords.latitude, coords.longitude);
            },
            (error) => {
                console.error("Error obteniendo la ubicación:", error);
                renderDashboard();
            }
        );
    } else {
        renderDashboard();
    }

    new Sortable(locationsGrid, {
        animation: 150,
        ghostClass: "sortable-ghost",
        handle: ".location-card",
        filter: ".placeholder-card, .is-pinned",
        onEnd: () => {
            const newOrderIds = Array.from(locationsGrid.children)
                .map((card) =>
                    card.dataset.locationId ? parseInt(card.dataset.locationId) : null
                )
                .filter((id) => id !== null);

            const heroCardId =
                heroSection.querySelector(".hero-card")?.dataset.locationId;
            if (heroCardId) {
                newOrderIds.unshift(parseInt(heroCardId));
            }

            const reorderedLocations = newOrderIds
                .map((id) => savedLocations.find((loc) => loc.id === id))
                .filter(Boolean);
            savedLocations = reorderedLocations;

            saveToStorage();
        },
    });
};

const renderDashboard = () => {
    if (savedLocations.length === 0) {
        locationsGrid.innerHTML = "";
        heroSection.innerHTML = "";
        renderPlaceholder();
    } else {
        const currentHeroId =
            heroSection.querySelector(".hero-card")?.dataset.locationId;
        if (!currentHeroId || parseInt(currentHeroId) !== savedLocations[0].id) {
            heroSection.innerHTML = "";
            createHeroCard(savedLocations[0]);
        }

        const remainingLocations = savedLocations.slice(1);

        if (remainingLocations.length === 0) {
            const existingPlaceholder = locationsGrid.querySelector(".placeholder-card");
            if (!existingPlaceholder) {
                locationsGrid.innerHTML = "";
                setTimeout(() => {
                    renderPlaceholder();
                }, 50);
            }
        } else {
            locationsGrid.innerHTML = "";
            remainingLocations.forEach((location, index) => {
                setTimeout(() => {
                    createWeatherCard(location, true);
                }, index * 100);
            });
        }
    }
};

const renderPlaceholder = () => {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder-card";
    placeholder.title = "Añadir nueva ubicación";
    placeholder.innerHTML = `
                <div class="add-new-icon-wrapper">
                        <div class="add-new-icon">+</div>
                </div>
        `;

    locationsGrid.appendChild(placeholder);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            placeholder.classList.add("card-visible");
        });
    });
};

const createHeroCard = async (locationData) => {
    if (!heroSection || !locationData) return;
    try {
        const data = await getWeatherData(`${locationData.name},${locationData.country}`);
        const backgroundClass = getWeatherBackgroundClass(data.weather[0].main);

        heroSection.innerHTML = `
                        <div class="hero-card ${backgroundClass}" data-location-id="${data.id}">
                                <div class="card-actions">
                                        <button class="card-btn remove-btn" title="Eliminar ubicación">
                                                <img src="/icons/trash.svg" alt="Eliminar">
                                        </button>
                                </div>
                                <div class="weather-info">
                                        <h2 class="location-name">${data.name}, ${data.sys.country}</h2>
                                        <p class="weather-desc">${data.weather[0].description}</p>
                                </div>
                                <div class="temp-container">
                                        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png" alt="Icono del clima">
                                        <span class="temp">${Math.round(data.main.temp)}°C</span>
                                </div>
                                <a href="/detalles.html?id=${data.id}" class="details-btn">Ver Detalles</a>
                        </div>
                `;

        const heroCard = heroSection.querySelector(".hero-card");
        if (heroCard) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    heroCard.classList.add("visible");
                });
            });
        }
    } catch (error) {
        console.error("Error al crear la tarjeta Hero:", error);
        heroSection.innerHTML = `<p class="error-message">No se pudo cargar la ubicación destacada.</p>`;
    }
};

const handleAlertClick = () => {
    const youtubeUrl = "https://www.youtube.com/watch?v=oVIiZm83WGc";
    window.open(youtubeUrl, "_blank");
};

const createWeatherCard = async (locationData, shouldAnimate) => {
    const card = document.createElement("div");
    try {
        const data = await getWeatherData(`${locationData.name},${locationData.country}`);
        card.dataset.locationId = data.id;
        card.dataset.weather = data.weather[0].main;
        const backgroundClass = getWeatherBackgroundClass(data.weather[0].main);
        card.className = `location-card ${backgroundClass} ${
            locationData.isPinned ? "is-pinned" : ""
        }`;

        if (currentFilter !== "all" && data.weather[0].main !== currentFilter) {
            card.classList.add("filtered-out");
        }

        card.innerHTML = `
                        <div class="card-content">
                                <div class="card-header">
                                        <h2>${data.name}, ${data.sys.country}</h2>
                                        <div class="card-actions">
                                                <button class="card-btn pin-btn ${locationData.isPinned ? "is-pinned" : ""}" title="Convertir en principal">
                                                        <img src="/icons/pin.svg" alt="Fijar">
                                                </button>
                                                <button class="card-btn remove-btn" title="Eliminar ubicación">
                                                        <img src="/icons/trash.svg" alt="Eliminar">
                                                </button>
                                        </div>
                                </div>
                                <div class="card-body">
                                        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Icono del clima">
                                        <p class="temperature">${Math.round(data.main.temp)}°C</p>
                                        <p class="description">${data.weather[0].description}</p>
                                </div>
                        </div>
                        <div class="card-footer">
                                <a href="/detalles.html?id=${data.id}" class="details-btn">Ver Detalles</a>
                        </div>
                `;

        locationsGrid.appendChild(card);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.classList.add("card-visible");
            });
        });
    } catch (error) {
        console.error(`Error al crear la tarjeta para ${locationData.name}: ${error}`);
        card.remove();
    }
};

const handleSearch = async (e) => {
    e.preventDefault();
    const cityQuery = cityInput.value.trim();
    if (cityQuery) {
        await addLocationByQuery(cityQuery);
        cityInput.value = "";
    }
};

const handleHeroCardActions = (e) => {
    const card = e.target.closest(".hero-card");
    if (!card) return;
    handleCardActions(e);
};

const handleCardActions = (e) => {
    if (e.target.closest(".placeholder-card")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        cityInput.focus();
        return;
    }

    const card =
        e.target.closest(".location-card") || e.target.closest(".hero-card");
    if (!card || e.target.closest(".details-btn")) return;
    if (e.target.closest(".card-btn")) e.stopPropagation();

    const locationId = parseInt(card.dataset.locationId);

    if (e.target.matches(".remove-btn, .remove-btn *")) {
        savedLocations = savedLocations.filter((loc) => loc.id !== locationId);
        saveToStorage();

        if (card.classList.contains("hero-card")) {
            card.style.transition = "opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)";
            card.style.opacity = "0";
            setTimeout(() => {
                if (savedLocations.length === 0) {
                    heroSection.innerHTML = "";
                    locationsGrid.innerHTML = "";
                    renderPlaceholder();
                } else {
                    heroSection.innerHTML = "";
                    createHeroCard(savedLocations[0]);
                    const remainingLocations = savedLocations.slice(1);
                    locationsGrid.innerHTML = "";
                    if (remainingLocations.length === 0) {
                        setTimeout(() => renderPlaceholder(), 100);
                    } else {
                        remainingLocations.forEach((location, index) => {
                            setTimeout(() => {
                                createWeatherCard(location, true);
                            }, index * 100);
                        });
                    }
                }
            }, 400);
        } else {
            card.classList.add("card-removing");
            card.addEventListener(
                "transitionend",
                () => {
                    card.remove();
                    if (savedLocations.length === 1) {
                        setTimeout(() => {
                            renderPlaceholder();
                        }, 100);
                    }
                },
                { once: true }
            );
        }
    }

    if (e.target.matches(".pin-btn, .pin-btn *")) {
        const itemIndex = savedLocations.findIndex((loc) => loc.id === locationId);

        if (itemIndex > 0) {
            const appContainer = document.querySelector(".app-container");
            appContainer.classList.add("fade-out");

            setTimeout(() => {
                const [itemToPromote] = savedLocations.splice(itemIndex, 1);
                savedLocations.unshift(itemToPromote);
                saveToStorage();

                renderDashboard();

                setTimeout(() => {
                    appContainer.classList.remove("fade-out");
                }, 50);
            }, 400);
        }
    }
};

const handleFilterChange = () => {
    currentFilter = weatherFilter.value;
    const cards = document.querySelectorAll(".location-card");

    cards.forEach((card, index) => {
        setTimeout(() => {
            const matchesFilter =
                currentFilter === "all" || card.dataset.weather === currentFilter;
            card.classList.toggle("filtered-out", !matchesFilter);
        }, index * 50);
    });
};

const addLocation = (weatherData) => {
    if (savedLocations.some((loc) => loc.id === weatherData.id)) {
        alert("Esta ciudad ya está en tu dashboard.");
        return;
    }

    const newLocation = {
        id: weatherData.id,
        name: weatherData.name,
        country: weatherData.sys.country,
        isPinned: false,
    };

    const placeholder = locationsGrid.querySelector(".placeholder-card");
    if (placeholder && savedLocations.length >= 1) {
        placeholder.classList.remove("card-visible");
        placeholder.classList.add("placeholder-removing");
        placeholder.addEventListener(
            "transitionend",
            () => {
                if (placeholder.parentNode) {
                    placeholder.remove();
                }
            },
            { once: true }
        );
    }

    savedLocations.push(newLocation);
    saveToStorage();

    if (savedLocations.length === 1) {
        setTimeout(() => {
            renderDashboard();
        }, placeholder ? 300 : 0);
    } else {
        setTimeout(() => {
            createWeatherCard(newLocation, true);
        }, placeholder ? 300 : 200);
    }
};

const addLocationByQuery = async (query) => {
    loader.style.display = "block";
    try {
        const weatherData = await getWeatherData(query);
        addLocation(weatherData);
    } catch (error) {
        alert(error.message);
    } finally {
        loader.style.display = "none";
    }
};

const addLocationByCoords = async (lat, lon) => {
    loader.style.display = "block";
    try {
        const weatherData = await getWeatherDataByCoords(lat, lon);
        addLocation(weatherData);
    } catch (error) {
        alert(error.message);
    } finally {
        loader.style.display = "none";
    }
};

const openMapModal = () => {
    mapModal.classList.remove("hidden");
    mapModal.offsetHeight;
    if (!map) {
        setTimeout(() => {
            map = L.map(mapContainer).setView([-34.58, -58.67], 7);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
            }).addTo(map);
            map.on("click", onMapClick);
        }, 200);
    } else {
        setTimeout(() => map.invalidateSize(), 200);
    }
};

const closeMapModal = () => {
    mapModal.classList.add("hidden");
};

const onMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    L.popup()
        .setLatLng(e.latlng)
        .setContent("Buscando clima aquí...")
        .openOn(map);
    await addLocationByCoords(lat, lng);
    setTimeout(() => {
        closeMapModal();
    }, 500);
};

const getWeatherData = async (query) => {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error de red al buscar coordenadas.");
    const data = await response.json();
    if (!data.length) throw new Error(`No se encontró la ubicación: "${query}"`);
    return getWeatherDataByCoords(data[0].lat, data[0].lon);
};

const getWeatherDataByCoords = async (lat, lon) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`;
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 401)
            throw new Error("La API Key no es válida o no está activada.");
        throw new Error("No se pudo obtener el clima para estas coordenadas.");
    }
    return response.json();
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

const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLocations));
};

init();
