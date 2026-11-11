const config = window.AUTH0_CONFIG || {};
const status = document.querySelector("#status");
const content = document.querySelector("#app-content");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const createSection = document.querySelector("#create-section");
let authClient;

function canCreate(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const permissions = JSON.parse(atob(payload)).permissions;
    return Array.isArray(permissions) && permissions.includes("create:avaliacoes");
  } catch {
    return false;
  }
}

function showStatus(message) { status.textContent = message; }

async function api(path, options = {}) {
  const token = await authClient.getTokenSilently();
  const baseUrl = (config.apiBaseUrl || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers }
  });
  if (!response.ok) throw new Error(`A API respondeu com erro ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

function renderReviews(reviews) {
  const target = document.querySelector("#reviews");
  target.replaceChildren();
  if (!reviews.length) {
    target.innerHTML = '<p class="empty">Ainda não há artigos cadastradas.</p>';
    return;
  }
  for (const review of reviews) {
    const card = document.createElement("article");
    card.className = "review";
    const head = document.createElement("div");
    head.className = "review-head";
    const person = document.createElement("strong");
    person.textContent = review.emailAvaliado;
    const score = document.createElement("span");
    score.className = "score";
    score.textContent = `${review.prioridade}`;
    head.append(person, score);
    const by = document.createElement("p");
    by.className = "muted";
    by.textContent = `Criado por ${review.emailCriado}`;
    const comment = document.createElement("p");
    card.append(head, by, comment);
    target.append(card);
  }
}

async function loadReviews() {
  try {
    renderReviews(await api("/avaliacoes"));
    showStatus("Você está conectado.");
  } catch (error) {
    showStatus(`${error.message} Verifique se a API está configurada para aceitar tokens do Auth0.`);
  }
}

async function updateSession() {
  const loggedIn = await authClient.isAuthenticated();
  loginButton.classList.toggle("hidden", loggedIn);
  logoutButton.classList.toggle("hidden", !loggedIn);
  content.classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    const token = await authClient.getTokenSilently();
    createSection.classList.toggle("hidden", !canCreate(token));
    await loadReviews();
  } else {
    createSection.classList.add("hidden");
    showStatus("Entre para consultar avaliações.");
  }
}

async function start() {
  if (!config.domain || !config.clientId || !config.audience || config.domain.includes("SEU_TENANT") || config.clientId.includes("SEU_CLIENT_ID")) {
    showStatus("Configure Domain, Client ID e Audience do Auth0 antes de publicar.");
    loginButton.disabled = true;
    return;
  }
  try {
    authClient = await window.auth0.createAuth0Client({
      domain: config.domain,
      clientId: config.clientId,
      authorizationParams: { redirect_uri: window.location.origin, audience: config.audience }
    });
    if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
      await authClient.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    await updateSession();
  } catch (error) {
    showStatus(`Não foi possível conectar ao Auth0: ${error.message}`);
  }
}

loginButton.addEventListener("click", () => authClient.loginWithRedirect());
logoutButton.addEventListener("click", () => authClient.logout({ logoutParams: { returnTo: window.location.origin } }));
document.querySelector("#review-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const review = Object.fromEntries(form.entries());
  review.nota = Number(review.nota);
  try {
    await api("/avaliacoes", { method: "POST", body: JSON.stringify(review) });
    event.currentTarget.reset();
    await loadReviews();
  } catch (error) {
    showStatus(error.message);
  }
});

start();
