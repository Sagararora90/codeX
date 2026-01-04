import socket from 'socket.io-client';


let socketInstance = null;


export const initializeSocket = (projectId) => {
    // Don't recreate if already connected to the same project
    if (socketInstance && socketInstance.io.opts.query?.projectId === projectId) {
        console.log("Socket already connected to project:", projectId);
        return socketInstance;
    }

    // Disconnect existing socket if connecting to different project
    if (socketInstance) {
        console.log("Disconnecting previous socket");
        socketInstance.disconnect();
    }

    socketInstance = socket(import.meta.env.VITE_API_URL, {
        auth: {
            token: localStorage.getItem('token')
        },
        query: {
            projectId
        }
    });

    console.log("New socket instance created for project:", projectId);
    return socketInstance;

}

export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}

export const receiveMessage = (eventName, cb) => {
    if (socketInstance) {
        socketInstance.on(eventName, cb);
    }
}

export const removeListener = (eventName, cb) => {
    if (socketInstance) {
        socketInstance.off(eventName, cb);
    }
}

export const sendMessage = (eventName, data) => {
    if (socketInstance) {
        socketInstance.emit(eventName, data);
    }
}