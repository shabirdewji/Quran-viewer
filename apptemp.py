.nav-arrows {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(env(safe-area-inset-bottom) + 20px);

    display: flex;
    justify-content: space-between;

    padding: 0 18px;
    z-index: 9999;
    pointer-events: none;
}

.glass-btn {
    pointer-events: auto;

    width: 58px;
    height: 58px;

    border-radius: 18px;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 26px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);

    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
        0 10px 25px rgba(0, 0, 0, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);

    transition: all 0.2s ease;
}

.glass-btn:active {
    transform: scale(0.92);
    background: rgba(255, 255, 255, 0.12);
    box-shadow:
        0 6px 15px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
}