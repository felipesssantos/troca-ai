export const States = {
    IDLE: 'IDLE',
    AWAITING_PHONE_LINK: 'AWAITING_PHONE_LINK',
    AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
    AWAITING_ALBUM_CHOICE: 'AWAITING_ALBUM_CHOICE',
    AWAITING_ACTION: 'AWAITING_ACTION',
    AWAITING_PHOTO: 'AWAITING_PHOTO',
    AWAITING_STICKER_CONFIRMATION: 'AWAITING_STICKER_CONFIRMATION'
};

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    getSession(phone) {
        if (!this.sessions.has(phone)) {
            this.sessions.set(phone, { state: States.IDLE, data: {} });
        }
        return this.sessions.get(phone);
    }

    updateState(phone, newState, partialData = {}) {
        const session = this.getSession(phone);
        session.state = newState;
        session.data = { ...session.data, ...partialData };
        this.sessions.set(phone, session);
    }

    clearSession(phone) {
        this.sessions.delete(phone);
    }
}

export const sessionManager = new SessionManager();
