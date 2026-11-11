let ws;
let isConnected = false;
let messageDiv = document.querySelector("#messages");
let errorMessageSpan = document.querySelector("#errorMessage");
let connectionStatusSpan = document.querySelector("#connectionStatus");
let usernameInput = document.querySelector("#username");
let passwordInput = document.querySelector("#password");
let loginButton = document.querySelector("#login");
let messageTextarea = document.querySelector("#messageContent");

const setConnectionState = (connected) => {
    isConnected = connected;
    connectionStatusSpan.textContent = connected ? "Estado: Conectado" : "Estado: Desconectado";
    connectionStatusSpan.classList.toggle("status-connected", connected);
    connectionStatusSpan.classList.toggle("status-disconnected", !connected);
    loginButton.value = connected ? "Logout" : "Login";
    usernameInput.disabled = connected;
    passwordInput.disabled = connected;
}

// Take the entered username and password and attempt to authenticate them. If the
// response indicates an error, provide the error message.
const getJwtAuth = () => {
    if (isConnected && ws) {
        ws.close();
        return;
    }

    const username = document.querySelector("#username").value;
    const password = document.querySelector("#password").value;

    fetch("https://localhost:5000/auth?username=" + username + "&password=" + password)
        .then(response => response.text())
        .then((response) => {
            if (response.includes("Error")) {
                errorMessageSpan.innerHTML = response;
            } else {
                errorMessageSpan.innerHTML = "";
                openWsConnection(response);
            }
        })
        .catch(err => console.log(err));
}

// Send the message entered by the user. First, however, ensure that the user is logged
// in and that the message field is not empty.
const sendWsMessage = () => {
    var messageContent = document.querySelector("#messageContent").value;

    if (ws && ws.readyState === WebSocket.OPEN) {
        if (messageContent != "") {
            ws.send(messageContent);
        } else {
            errorMessageSpan.innerHTML = "Error: Message content cannot be empty."
        }
    } else {
        errorMessageSpan.innerHTML = "Error: You must log in to send a message."
    }
}

// Open the WebSocket connection using the JWT.
const openWsConnection = (jwtAuth) => {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket("wss://localhost:5000/ws?token=" + jwtAuth);

    ws.onopen = (event) => {
        console.log("WebSocket connection established.");
        setConnectionState(true);
        messageTextarea.focus();
    }

    ws.onmessage = (event) => {
        console.log("WebSocket message received: ", event.data);

        if (event.data.includes("Error")) {
            errorMessageSpan.innerHTML = event.data;
        } else {
            const newMessageDiv = document.createElement("div");
            newMessageDiv.className = "message-item";
            newMessageDiv.textContent = event.data;

            messageDiv.appendChild(newMessageDiv);
        }
    }

    ws.onerror = (event) => {
        console.log("WebSocket error received: ", event);
    }

    ws.onclose = (event) => {
        console.log("WebSocket connection closed.");
        ws = null;
        setConnectionState(false);
    }
}

setConnectionState(false);


