/*
 * Vencord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

const TAB_ID = "vc-showperfil-tab";
const OVERLAY_ID = "vc-showperfil-overlay";
const MODAL_ID = "vc-showperfil-modal";
const STYLE_ID = "vc-showperfil-style";

let observer: MutationObserver | null = null;

function extractUserId(input: string): string | null {
    const value = input.trim();

    if (/^\d{17,20}$/.test(value)) return value;

    const mentionMatch = value.match(/^<@!?(\d{17,20})>$/);
    if (mentionMatch) return mentionMatch[1];

    const urlMatch = value.match(/discord\.com\/users\/(\d{17,20})/i);
    if (urlMatch) return urlMatch[1];

    return null;
}

function extractUsername(input: string): string | null {
    const value = input.trim();

    // aceita formatos comuns de username atual e legado
    if (/^[a-z0-9._]{2,32}$/i.test(value)) return value;
    if (/^.{2,32}#\d{4}$/.test(value)) return value;

    return null;
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #${OVERLAY_ID} {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.72);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            animation: vcSpFadeIn 120ms ease-out;
            backdrop-filter: blur(2px);
        }

        #${MODAL_ID} {
            width: 100%;
            max-width: 480px;
            border-radius: 16px;
            overflow: hidden;
            background: #111214;
            box-shadow:
                0 24px 48px rgba(0, 0, 0, 0.45),
                0 8px 16px rgba(0, 0, 0, 0.28);
            color: #f2f3f5;
            font-family: var(--font-primary, gg sans, "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif);
            animation: vcSpScaleIn 140ms ease-out;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        #${MODAL_ID} .sp-header {
            padding: 20px 20px 8px 20px;
        }

        #${MODAL_ID} .sp-title {
            font-size: 24px;
            line-height: 30px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 8px 0;
        }

        #${MODAL_ID} .sp-subtitle {
            font-size: 14px;
            line-height: 18px;
            color: #b5bac1;
            margin: 0;
        }

        #${MODAL_ID} .sp-body {
            padding: 16px 20px 20px 20px;
        }

        #${MODAL_ID} .sp-label {
            display: block;
            margin-bottom: 8px;
            color: #f2f3f5;
            font-size: 12px;
            line-height: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        #${MODAL_ID} .sp-required {
            color: #f23f43;
            margin-left: 4px;
        }

        #${MODAL_ID} .sp-inputWrap {
            background: #1e1f22;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 0;
            transition: border-color 120ms ease, box-shadow 120ms ease;
        }

        #${MODAL_ID} .sp-inputWrap:focus-within {
            border-color: #5865f2;
            box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.18);
        }

        #${MODAL_ID} .sp-input {
            width: 100%;
            box-sizing: border-box;
            border: none;
            outline: none;
            background: transparent;
            color: #f2f3f5;
            padding: 14px 14px;
            font-size: 15px;
            line-height: 20px;
        }

        #${MODAL_ID} .sp-input::placeholder {
            color: #80848e;
        }

        #${MODAL_ID} .sp-help {
            margin-top: 10px;
            font-size: 12px;
            line-height: 16px;
            color: #949ba4;
        }

        #${MODAL_ID} .sp-error {
            display: none;
            margin-top: 10px;
            color: #fa777c;
            font-size: 12px;
            line-height: 16px;
            font-weight: 500;
        }

        #${MODAL_ID} .sp-warning {
            display: none;
            margin-top: 10px;
            color: #f0b232;
            font-size: 12px;
            line-height: 16px;
            font-weight: 500;
        }

        #${MODAL_ID} .sp-footer {
            background: #18191c;
            padding: 16px 20px 20px 20px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            border-top: 1px solid rgba(255,255,255,0.05);
        }

        #${MODAL_ID} .sp-btn {
            border: none;
            border-radius: 10px;
            min-height: 40px;
            padding: 0 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 80ms ease, opacity 120ms ease, background 120ms ease;
        }

        #${MODAL_ID} .sp-btn:active {
            transform: translateY(1px);
        }

        #${MODAL_ID} .sp-btn-secondary {
            background: rgba(255,255,255,0.06);
            color: #f2f3f5;
        }

        #${MODAL_ID} .sp-btn-secondary:hover {
            background: rgba(255,255,255,0.1);
        }

        #${MODAL_ID} .sp-btn-primary {
            background: #5865f2;
            color: white;
        }

        #${MODAL_ID} .sp-btn-primary:hover {
            background: #4752c4;
        }

        #${MODAL_ID} .sp-btn-primary:disabled {
            opacity: 0.6;
            cursor: default;
        }

        @keyframes vcSpFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes vcSpScaleIn {
            from { opacity: 0; transform: scale(0.98) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

function getFriendsTabReference(): HTMLElement | null {
    const elements = Array.from(document.querySelectorAll("div, a")) as HTMLElement[];

    return elements.find(el => {
        const text = el.textContent?.trim();
        return text === "Adicionar amigo" || text === "Add Friend";
    }) ?? null;
}

function closeModal() {
    document.getElementById(OVERLAY_ID)?.remove();
}

function openProfileById(userId: string) {
    try {
        history.pushState({}, "", `/users/${userId}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
        location.assign(`/users/${userId}`);
    }
}

function goToAddFriendWithUsername(username: string) {
    // Vai para a aba de adicionar amigo sem reload bruto
    try {
        history.pushState({}, "", `/channels/@me`);
        window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
        location.assign("/channels/@me");
    }

    // Tenta preencher o campo de Add Friend
    setTimeout(() => {
        const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
        const target = inputs.find(i => {
            const p = (i.placeholder || "").toLowerCase();
            const a = (i.getAttribute("aria-label") || "").toLowerCase();
            return p.includes("username") || p.includes("nome de usuário") || a.includes("username") || a.includes("nome de usuário");
        });

        if (!target) return;

        target.focus();
        target.value = username;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
    }, 250);
}

function openModal() {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;

    overlay.innerHTML = `
        <div id="${MODAL_ID}" role="dialog" aria-modal="true" aria-labelledby="sp-title">
            <div class="sp-header">
                <div id="sp-title" class="sp-title">Mostrar perfil</div>
                <p class="sp-subtitle">
                    Cole um ID, menção, link ou username do Discord.
                </p>
            </div>

            <div class="sp-body">
                <label class="sp-label" for="sp-input">
                    Usuário<span class="sp-required">*</span>
                </label>

                <div class="sp-inputWrap">
                    <input
                        id="sp-input"
                        class="sp-input"
                        type="text"
                        placeholder="123456789012345678 ou usuario"
                        autocomplete="off"
                        spellcheck="false"
                    />
                </div>

                <div class="sp-help">
                    Melhor caso: ID, menção ou link. Username só dá para tratar como tentativa; para usuário fora do seu alcance atual, o caminho confiável continua sendo o ID.
                </div>

                <div id="sp-error" class="sp-error"></div>
                <div id="sp-warning" class="sp-warning"></div>
            </div>

            <div class="sp-footer">
                <button id="sp-cancel" class="sp-btn sp-btn-secondary" type="button">Cancelar</button>
                <button id="sp-open" class="sp-btn sp-btn-primary" type="button">Continuar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const modal = overlay.querySelector(`#${MODAL_ID}`) as HTMLDivElement;
    const input = overlay.querySelector("#sp-input") as HTMLInputElement;
    const errorEl = overlay.querySelector("#sp-error") as HTMLDivElement;
    const warningEl = overlay.querySelector("#sp-warning") as HTMLDivElement;
    const cancelBtn = overlay.querySelector("#sp-cancel") as HTMLButtonElement;
    const openBtn = overlay.querySelector("#sp-open") as HTMLButtonElement;

    const clearMessages = () => {
        errorEl.style.display = "none";
        warningEl.style.display = "none";
        errorEl.textContent = "";
        warningEl.textContent = "";
    };

    const submit = () => {
        clearMessages();

        const value = input.value.trim();
        if (!value) {
            errorEl.style.display = "block";
            errorEl.textContent = "Digite um ID, menção, link ou username.";
            return;
        }

        const userId = extractUserId(value);
        if (userId) {
            closeModal();
            openProfileById(userId);
            return;
        }

        const username = extractUsername(value);
        if (username) {
            warningEl.style.display = "block";
            warningEl.textContent =
                "Username sozinho não garante abrir o perfil direto. Vou te mandar para Adicionar amigo com o nome preenchido.";
            setTimeout(() => {
                closeModal();
                goToAddFriendWithUsername(username);
            }, 500);
            return;
        }

        errorEl.style.display = "block";
        errorEl.textContent = "Formato inválido. Use ID, menção, link ou username.";
    };

    cancelBtn.addEventListener("click", closeModal);
    openBtn.addEventListener("click", submit);

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") closeModal();
    });

    overlay.addEventListener("click", e => {
        if (e.target === overlay) closeModal();
    });

    modal.addEventListener("click", e => {
        e.stopPropagation();
    });

    input.focus();
}

function createTab(reference: HTMLElement): HTMLElement {
    const btn = document.createElement(reference.tagName.toLowerCase());
    btn.id = TAB_ID;
    btn.className = reference.className;
    btn.textContent = "Mostrar perfil";
    btn.setAttribute("role", "tab");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-selected", "false");

    const run = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        (e as Event).stopImmediatePropagation?.();
        openModal();
    };

    btn.addEventListener("click", run, true);
    btn.addEventListener("mousedown", e => {
        e.preventDefault();
        e.stopPropagation();
    }, true);

    btn.addEventListener("keydown", e => {
        if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") {
            run(e);
        }
    }, true);

    return btn;
}

function injectTab() {
    if (document.getElementById(TAB_ID)) return;

    const reference = getFriendsTabReference();
    if (!reference || !reference.parentElement) return;

    const tab = createTab(reference);
    reference.insertAdjacentElement("afterend", tab);
}

function cleanup() {
    document.getElementById(TAB_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    closeModal();
}

export default definePlugin({
    name: "ShowPerfil",
    description: "Abre um modal moderno para navegar por ID/link/menção e tentar username.",
    authors: [{ name: "davim", id: 123456789012345678n }],

    start() {
        injectStyles();
        injectTab();

        observer = new MutationObserver(() => {
            injectTab();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log("[ShowPerfil] carregou");
    },

    stop() {
        observer?.disconnect();
        observer = null;
        cleanup();
        console.log("[ShowPerfil] parou");
    }
});