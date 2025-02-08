import { canvas, canvas2d } from '#/graphics/Canvas.js';
import Pix3D from '#/graphics/Pix3D.js';
import PixMap from '#/graphics/PixMap.js';

import { sleep } from '#/util/JsUtil.js';

import { CanvasEnabledKeys, KeyCodes } from '#/client/KeyCodes.js';
import InputTracking from '#/client/InputTracking.js';

export default abstract class GameShell {
    protected slowestMS: number = 0.0; // custom
    protected averageMS: number[] = []; // custom
    protected averageIndexMS: number = 0; // custom

    protected drawArea: PixMap | null = null;
    protected state: number = 0;
    protected deltime: number = 20;
    protected mindel: number = 1;
    protected otim: number[] = [];
    protected fps: number = 0;
    protected fpos: number = 0;
    protected frameTime: number[] = [];
    protected redrawScreen: boolean = true;
    protected resizeToFit: boolean = false;
    protected tfps: number = 50; // custom
    protected hasFocus: boolean = true; // mapview applet

    protected ingame: boolean = false;

    protected idleCycles: number = Date.now();
    protected mouseButton: number = 0;
    protected mouseX: number = 0;
    protected mouseY: number = 0;
    protected mouseClickButton: number = 0;
    protected mouseClickX: number = 0;
    protected mouseClickY: number = 0;
    protected actionKey: number[] = [];
    protected keyQueue: number[] = [];
    protected keyQueueReadPos: number = 0;
    protected keyQueueWritePos: number = 0;

    // touch controls
    private input: HTMLElement | null = null;
    private touching: boolean = false;
    private startedInViewport: boolean = false;
    private startedInTabArea: boolean = false;
    private time: number = -1;
    private sx: number = 0;
    private sy: number = 0;
    private mx: number = 0;
    private my: number = 0;
    private nx: number = 0;
    private ny: number = 0;

    constructor(resizetoFit: boolean = false) {
        canvas.tabIndex = -1;
        canvas2d.fillStyle = 'black';
        canvas2d.fillRect(0, 0, canvas.width, canvas.height);
        this.resizeToFit = resizetoFit;
        if (this.resizeToFit) {
            this.resize(window.innerWidth, window.innerHeight);
        } else {
            this.resize(canvas.width, canvas.height);
        }
    }

    abstract getTitleScreenState(): number;
    abstract isChatBackInputOpen(): boolean;
    abstract isShowSocialInput(): boolean;
    abstract getChatInterfaceId(): number;
    abstract getViewportInterfaceId(): number;
    abstract getReportAbuseInterfaceId(): number;  // custom: report abuse input on mobile

    protected get width(): number {
        return canvas.width;
    }

    protected get height(): number {
        return canvas.height;
    }

    protected resize(width: number, height: number) {
        canvas.width = width;
        canvas.height = height;
        this.drawArea = new PixMap(width, height);
        Pix3D.init2D();
    };

    async run() {
        canvas.addEventListener(
            'resize',
            (): void => {
                if (this.resizeToFit) {
                    this.resize(window.innerWidth, window.innerHeight);
                }
            },
            false
        );

        canvas.onfocus = this.onfocus.bind(this);
        canvas.onblur = this.onblur.bind(this);

        // pc
        canvas.onmousedown = this.onmousedown.bind(this);
        canvas.onmouseup = this.onmouseup.bind(this);
        canvas.onmouseenter = this.onmouseenter.bind(this);
        canvas.onmouseleave = this.onmouseleave.bind(this);
        canvas.onmousemove = this.onmousemove.bind(this);
        canvas.onkeydown = this.onkeydown.bind(this);
        canvas.onkeyup = this.onkeyup.bind(this);

        if (this.isMobile) {
            canvas.ontouchstart = this.ontouchstart.bind(this);
            canvas.ontouchend = this.ontouchend.bind(this);
            canvas.ontouchmove = this.ontouchmove.bind(this);
        }

        // Preventing mouse events from bubbling up to the context menu in the browser for our canvas.
        // This may need to be hooked up to our own context menu in the future.
        canvas.oncontextmenu = (e: MouseEvent): void => {
            e.preventDefault();
        };

        window.oncontextmenu = (e: MouseEvent): void => {
            e.preventDefault();
        };

        await this.showProgress(0, 'Loading...');
        await this.load();

        for (let i: number = 0; i < 10; i++) {
            this.otim[i] = performance.now();
        }

        let ntime: number;
        let opos: number = 0;
        let ratio: number = 256;
        let delta: number = 1;
        let count: number = 0;

        while (this.state >= 0) {
            if (this.state > 0) {
                this.state--;

                if (this.state === 0) {
                    this.shutdown();
                    return;
                }
            }

            const lastRatio: number = ratio;
            const lastDelta: number = delta;
            ratio = 300;
            delta = 1;

            ntime = performance.now();
            const otim: number = this.otim[opos];

            if (otim === 0) {
                ratio = lastRatio;
                delta = lastDelta;
            } else if (ntime > otim) {
                ratio = ((this.deltime * 2560) / (ntime - otim)) | 0;
            }

            if (ratio < 25) {
                ratio = 25;
            } else if (ratio > 256) {
                ratio = 256;
                delta = (this.deltime - (ntime - otim) / 10) | 0;
            }

            this.otim[opos] = ntime;
            opos = (opos + 1) % 10;

            if (delta > 1) {
                for (let i: number = 0; i < 10; i++) {
                    if (this.otim[i] !== 0) {
                        this.otim[i] += delta;
                    }
                }
            }

            if (delta < this.mindel) {
                delta = this.mindel;
            }

            await sleep(delta);

            while (count < 256) {
                await this.update();
                this.mouseClickButton = 0;
                this.keyQueueReadPos = this.keyQueueWritePos;
                count += ratio;
            }

            count &= 0xff;

            if (this.deltime > 0) {
                this.fps = ((ratio * 1000) / (this.deltime * 256)) | 0;
            }

            const time: number = performance.now();

            await this.draw();

            this.frameTime[this.fpos] = (performance.now() - time) / 1000;
            this.fpos = (this.fpos + 1) % this.frameTime.length;

            // this is custom for targeting specific fps (on mobile).
            if (this.tfps < 50) {
                const tfps: number = 1000 / this.tfps - (performance.now() - ntime);
                if (tfps > 0) {
                    await sleep(tfps);
                }
            }
        }
        if (this.state === -1) {
            this.shutdown();
        }
    }

    protected shutdown() {
        this.state = -2;
    };

    protected setFramerate(rate: number) {
        this.deltime = (1000 / rate) | 0;
    };

    protected setTargetedFramerate(rate: number) {
        this.tfps = Math.max(Math.min(50, rate | 0), 0);
    };

    protected start() {
        if (this.state >= 0) {
            this.state = 0;
        }
    };

    protected stop() {
        if (this.state >= 0) {
            this.state = (4000 / this.deltime) | 0;
        }
    };

    protected destroy() {
        this.state = -1;
    };

    protected async load() {}

    protected async update() {}

    protected async draw() {}

    protected async refresh() {}

    protected async showProgress(progress: number, message: string): Promise<void> {
        const width: number = this.width;
        const height: number = this.height;

        if (this.redrawScreen) {
            canvas2d.fillStyle = 'black';
            canvas2d.fillRect(0, 0, width, height);
            this.redrawScreen = false;
        }

        const y: number = height / 2 - 18;

        // draw full progress bar
        canvas2d.fillStyle = 'rgb(140, 17, 17)';
        canvas2d.rect(((width / 2) | 0) - 152, y, 304, 34);
        canvas2d.fillRect(((width / 2) | 0) - 150, y + 2, progress * 3, 30);

        // cover up progress bar
        canvas2d.fillStyle = 'black';
        canvas2d.fillRect(((width / 2) | 0) - 150 + progress * 3, y + 2, 300 - progress * 3, 30);

        // draw text
        canvas2d.font = 'bold 13px helvetica, sans-serif';
        canvas2d.textAlign = 'center';
        canvas2d.fillStyle = 'white';
        canvas2d.fillText(message, (width / 2) | 0, y + 22);

        await sleep(5); // return a slice of time to the main loop so it can update the progress bar
    }

    protected pollKey() {
        let key: number = -1;
        if (this.keyQueueWritePos !== this.keyQueueReadPos) {
            key = this.keyQueue[this.keyQueueReadPos];
            this.keyQueueReadPos = (this.keyQueueReadPos + 1) & 0x7f;
        }
        return key;
    };

    protected get ms(): number {
        const length: number = this.frameTime.length;
        let ft: number = 0;
        for (let index: number = 0; index < length; index++) {
            ft += this.frameTime[index];
        }
        const ms: number = (ft / length) * 1000;
        if (ms > this.slowestMS) {
            this.slowestMS = ms;
        }
        this.averageMS[this.averageIndexMS] = ms;
        this.averageIndexMS = (this.averageIndexMS + 1) % 250; // 250 circular limit
        return ms;
    }

    protected get msAvg(): number {
        return this.averageMS.reduce((accumulator: number, currentValue: number): number => accumulator + currentValue, 0) / 250; // 250 circular limit
    }

    // ----

    private onkeydown(e: KeyboardEvent) {
        this.idleCycles = Date.now();

        const keyCode = KeyCodes.get(e.key);
        if (!keyCode || (e.code.length === 0 && !e.isTrusted)) {
            return;
        }

        let ch: number = keyCode.ch;

        if (e.ctrlKey) {
            if ((ch >= 'A'.charCodeAt(0) && ch <= ']'.charCodeAt(0)) || ch == '_'.charCodeAt(0)) {
                ch -= 'A'.charCodeAt(0) - 1;
            } else if (ch >= 'a'.charCodeAt(0) && ch <= 'z'.charCodeAt(0)) {
                ch -= 'a'.charCodeAt(0) - 1;
            }
        }

        if (ch > 0 && ch < 128) {
            this.actionKey[ch] = 1;
        }

        if (ch > 4) {
            this.keyQueue[this.keyQueueWritePos] = ch;
            this.keyQueueWritePos = (this.keyQueueWritePos + 1) & 0x7f;
        }

        if (InputTracking.enabled) {
            InputTracking.keyPressed(ch);
        }

        if (!CanvasEnabledKeys.includes(e.key)) {
            e.preventDefault();
        }
    };

    private onkeyup(e: KeyboardEvent) {
        this.idleCycles = Date.now();

        const keyCode = KeyCodes.get(e.key);
        if (!keyCode || (e.code.length === 0 && !e.isTrusted)) {
            return;
        }

        let ch: number = keyCode.ch;

        if (e.ctrlKey) {
            if ((ch >= 'A'.charCodeAt(0) && ch <= ']'.charCodeAt(0)) || ch == '_'.charCodeAt(0)) {
                ch -= 'A'.charCodeAt(0) - 1;
            } else if (ch >= 'a'.charCodeAt(0) && ch <= 'z'.charCodeAt(0)) {
                ch -= 'a'.charCodeAt(0) - 1;
            }
        }

        if (ch > 0 && ch < 128) {
            this.actionKey[ch] = 0;
        }

        if (InputTracking.enabled) {
            InputTracking.keyReleased(ch);
        }

        if (!CanvasEnabledKeys.includes(e.key)) {
            e.preventDefault();
        }
    };

    // todo: this.time prevents mice from working on mobile
    private onmousedown(e: MouseEvent) {
        this.touching = false;
        //Don't 'reset' position (This fixes right click in Android)
        if (e.clientX > 0 || e.clientY > 0) this.setMousePosition(e);

        this.idleCycles = Date.now();
        this.mouseClickX = this.mouseX;
        this.mouseClickY = this.mouseY;

        if (this.isMobile && !this.isCapacitor) {
            if (this.insideMobileInputArea()) {
                this.mouseClickButton = 1;
                this.mouseButton = 1;
                return;
            }

            const eventTime: number = e.timeStamp;
            if (eventTime >= this.time + 500) {
                this.mouseClickButton = 2;
                this.mouseButton = 2;
            } else {
                this.mouseClickButton = 1;
                this.mouseButton = 1;
            }
        } else {
            if (e.button === 2) {
                this.mouseClickButton = 2;
                this.mouseButton = 2;
            } else if (e.button === 0) {
                // custom: explicitly check left-mouse button so middle mouse is ignored
                this.mouseClickButton = 1;
                this.mouseButton = 1;
            }
        }

        if (InputTracking.enabled) {
            InputTracking.mousePressed(this.mouseClickX, this.mouseClickY, e.button);
        }
    };

    private onmouseup(e: MouseEvent) {
        this.setMousePosition(e);
        this.idleCycles = Date.now();
        this.mouseButton = 0;

        if (InputTracking.enabled) {
            InputTracking.mouseReleased(e.button);
        }
    };

    private onmouseenter(e: MouseEvent) {
        this.setMousePosition(e);

        if (InputTracking.enabled) {
            InputTracking.mouseEntered();
        }
    };

    private onmouseleave(e: MouseEvent) {
        this.setMousePosition(e);

        // mapview applet
        this.idleCycles = Date.now();
        this.mouseX = -1;
        this.mouseY = -1;

        // custom (prevent mouse click from being stuck)
        this.mouseButton = 0;
        this.mouseClickX = -1;
        this.mouseClickY = -1;

        if (InputTracking.enabled) {
            InputTracking.mouseExited();
        }
    };

    private onmousemove(e: MouseEvent) {
        this.setMousePosition(e);

        this.idleCycles = Date.now();

        if (InputTracking.enabled) {
            InputTracking.mouseMoved(this.mouseX, this.mouseY);
        }
    };

    private onfocus(e: FocusEvent) {
        this.hasFocus = true;
        this.redrawScreen = true;
        this.refresh();

        if (InputTracking.enabled) {
            InputTracking.focusGained();
        }
    };

    private onblur(e: FocusEvent) {
        this.hasFocus = false;

        // CUSTOM: taken from later versions, releases all keys
        for (let i = 0; i < 128; i++) {
            this.actionKey[i] = 0;
        }

        if (InputTracking.enabled) {
            InputTracking.focusLost();
        }
    };

    private ontouchstart(e: TouchEvent) {
        if (!this.isMobile) {
            return;
        }

        if (this.input !== null) {
            this.input.parentNode?.removeChild(this.input);
            this.input = null;
        }

        this.touching = true;
        const touch: Touch = e.changedTouches[0];
        const clientX: number = touch.clientX | 0;
        const clientY: number = touch.clientY | 0;
        this.onmousemove(new MouseEvent('mousemove', { clientX: clientX, clientY: clientY }));

        this.sx = this.nx = this.mx = touch.screenX | 0;
        this.sy = this.ny = this.my = touch.screenY | 0;
        this.time = e.timeStamp;

        this.startedInViewport = this.insideViewportArea();
        this.startedInTabArea = this.insideTabArea();
    };

    private ontouchend(e: TouchEvent) {
        if (!this.isMobile || !this.touching) {
            return;
        }

        const touch: Touch = e.changedTouches[0];
        const clientX: number = touch.clientX | 0;
        const clientY: number = touch.clientY | 0;
        this.onmousemove(new MouseEvent('mousemove', { clientX: clientX, clientY: clientY }));

        this.nx = touch.screenX | 0;
        this.ny = touch.screenY | 0;

        this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowLeft', code: 'ArrowLeft' }));
        this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp' }));
        this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight' }));
        this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown' }));

        if (this.startedInViewport && !this.insideViewportArea()) {
            this.touching = false;
            return;
        } else if (this.startedInTabArea && !this.insideTabArea()) {
            this.touching = false;
            return;
        } else if (this.insideMobileInputArea()) {
            if (this.input !== null) {
                if (this.input.parentNode?.contains(this.input)) {
                    this.input.parentNode?.removeChild(this.input);
                }
                this.input = null;
            }

            const input: HTMLInputElement = document.createElement('input');
            if (this.insideUsernameArea()) {
                input.setAttribute('id', 'username');
                input.setAttribute('placeholder', 'Username');
            } else if (this.inPasswordArea()) {
                input.setAttribute('id', 'password');
                input.setAttribute('placeholder', 'Password');
            } else if (this.insideChatInputArea()) {
                input.setAttribute('id', 'chatinput');
                input.setAttribute('placeholder', 'Chatinput');
            } else if (this.insideChatPopupArea()) {
                input.setAttribute('id', 'chatpopup');
                input.setAttribute('placeholder', 'Chatpopup');
            } else if (this.insideReportInterfaceTextArea()) {
                input.setAttribute('id', 'reportinput');
                input.setAttribute('placeholder', 'Username');
            }
            if (this.isAndroid) {
                // this forces android to not use compose text for oninput. its good enough.
                input.setAttribute('type', 'password');
            } else {
                input.setAttribute('type', this.inPasswordArea() ? 'password' : 'text');
            }
            input.setAttribute('autofocus', 'autofocus');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('style', `position: fixed; left: ${clientX}px; top: ${clientY}px; width: 1px; height: 1px; opacity: 0;`);
            document.body.appendChild(input);

            input.focus();
            input.click();

            if (this.isAndroid) {
                input.oninput = (e: Event): void => {
                    if (!(e instanceof InputEvent)) {
                        return;
                    }
                    const input: InputEvent = e as InputEvent;
                    const data: string | null = input.data;

                    if (data === null) {
                        return;
                    }

                    if (input.inputType !== 'insertText') {
                        return;
                    }

                    this.onkeydown(new KeyboardEvent('keydown', { key: data, code: data }));
                };
            }

            input.onkeydown = (e: KeyboardEvent): void => {
                if (this.isAndroid) {
                    if (e.key === 'Enter' || e.key === 'Backspace') {
                        this.onkeydown(new KeyboardEvent('keydown', { key: e.key, code: e.key }));
                    }
                    return;
                }
                this.onkeydown(new KeyboardEvent('keydown', { key: e.key, code: e.key }));
            };

            input.onkeyup = (e: KeyboardEvent): void => {
                if (this.isAndroid) {
                    if (e.key === 'Enter' || e.key === 'Backspace') {
                        this.onkeyup(new KeyboardEvent('keyup', { key: e.key, code: e.key }));
                    }
                    return;
                }
                this.onkeyup(new KeyboardEvent('keyup', { key: e.key, code: e.key }));
            };

            input.onfocus = (e: FocusEvent): void => {
                this.input?.parentNode?.removeChild(this.input);
                this.input = null;
                this.onfocus(e);
            };

            this.input = input;
            this.touching = false;
            return;
        }

        const eventTime: number = e.timeStamp;
        const longPress: boolean = eventTime >= this.time + 500;
        const moved: boolean = Math.abs(this.sx - this.nx) > 16 || Math.abs(this.sy - this.ny) > 16;

        if (longPress && !moved) {
            this.touching = true;
            this.onmousedown(new MouseEvent('mousedown', { clientX, clientY, button: 2 }));
        }
    };

    private ontouchmove(e: TouchEvent) {
        if (!this.isMobile || !this.touching) {
            return;
        }

        if (e.touches.length > 1) {
            // allow multiple touch points to scroll on the page instead
            return;
        }

        e.preventDefault();

        const touch: Touch = e.changedTouches[0];
        const clientX: number = touch.clientX | 0;
        const clientY: number = touch.clientY | 0;
        this.onmousemove(new MouseEvent('mousemove', { clientX: clientX, clientY: clientY }));

        this.nx = touch.screenX | 0;
        this.ny = touch.screenY | 0;

        if (this.startedInViewport && this.getViewportInterfaceId() === -1) {
            // Camera panning
            if (this.mx - this.nx > 0) {
                this.rotate(2);
            } else if (this.mx - this.nx < 0) {
                this.rotate(0);
            }

            if (this.my - this.ny > 0) {
                this.rotate(3);
            } else if (this.my - this.ny < 0) {
                this.rotate(1);
            }
        } else if (this.startedInTabArea || this.getViewportInterfaceId() !== -1) {
            // Drag and drop
            this.onmousedown(new MouseEvent('mousedown', { clientX, clientY, button: 1 }));
        }

        this.mx = this.nx;
        this.my = this.ny;
    };

    protected get isMobile(): boolean {
        const keywords: string[] = ['Android', 'webOS', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 'Windows Phone'];
        return keywords.some((keyword: string): boolean => navigator.userAgent.includes(keyword));
    }

    private get isAndroid(): boolean {
        const keywords: string[] = ['Android'];
        return keywords.some((keyword: string): boolean => navigator.userAgent.includes(keyword));
    }

    private get isCapacitor(): boolean {
        const keywords: string[] = ['Capacitor'];
        return keywords.some((keyword: string): boolean => navigator.userAgent.includes(keyword));
    }

    private insideViewportArea() {
        // 512 x 334
        const viewportAreaX1: number = 8;
        const viewportAreaY1: number = 11;
        const viewportAreaX2: number = viewportAreaX1 + 512;
        const viewportAreaY2: number = viewportAreaY1 + 334;
        return this.ingame && this.mouseX >= viewportAreaX1 && this.mouseX <= viewportAreaX2 && this.mouseY >= viewportAreaY1 && this.mouseY <= viewportAreaY2;
    };

    private insideMobileInputArea() {
        // custom: for mobile keyboard input
        return this.insideChatInputArea() || this.insideUsernameArea() || this.inPasswordArea() || this.insideReportInterfaceTextArea();
    }

    private insideChatInputArea() {
        // 495 x 33
        const chatInputAreaX1: number = 11;
        const chatInputAreaY1: number = 449;
        const chatInputAreaX2: number = chatInputAreaX1 + 495;
        const chatInputAreaY2: number = chatInputAreaY1 + 33;
        return (
            this.ingame &&
            this.getChatInterfaceId() === -1 &&
            !this.isChatBackInputOpen() &&
            !this.isShowSocialInput() &&
            this.mouseX >= chatInputAreaX1 &&
            this.mouseX <= chatInputAreaX2 &&
            this.mouseY >= chatInputAreaY1 &&
            this.mouseY <= chatInputAreaY2
        );
    };

    private insideChatPopupArea() {
        // 495 x 99
        const chatInputAreaX1: number = 11;
        const chatInputAreaY1: number = 383;
        const chatInputAreaX2: number = chatInputAreaX1 + 495;
        const chatInputAreaY2: number = chatInputAreaY1 + 99;
        return this.ingame && (this.isChatBackInputOpen() || this.isShowSocialInput()) && this.mouseX >= chatInputAreaX1 && this.mouseX <= chatInputAreaX2 && this.mouseY >= chatInputAreaY1 && this.mouseY <= chatInputAreaY2;
    };


    private insideReportInterfaceTextArea() {
        // custom: for report abuse input on mobile
        // actual component size is [233, 137, 58 14]
        // extended it a little bit for easier interaction, since the area to
        // touch is not obvious (it's a bit narrow)
        if (!this.ingame) {
            return false;
        }
        const viewportInterfaceId = this.getViewportInterfaceId();
        const reportAbuseInterfaceId = this.getReportAbuseInterfaceId();
        // either viewport or report-abuse interface Ids are bad
        if (viewportInterfaceId === -1 || reportAbuseInterfaceId === -1) {
            return false;
        }
        // active viewport interface Id does not match
        if (viewportInterfaceId !== reportAbuseInterfaceId) {
            return false;
        }
        const reportInputAreaX1: number = 82;
        const reportInputAreaY1: number = 137;
        const reportInputAreaX2: number = reportInputAreaX1 + 366;
        const reportInputAreaY2: number = reportInputAreaY1 + 26;
        return (
            this.mouseX >= reportInputAreaX1 &&
            this.mouseX <= reportInputAreaX2 &&
            this.mouseY >= reportInputAreaY1 &&
            this.mouseY <= reportInputAreaY2
        );
    };

    private insideTabArea() {
        // 190 x 261
        const tabAreaX1: number = 562;
        const tabAreaY1: number = 231;
        const tabAreaX2: number = tabAreaX1 + 190;
        const tabAreaY2: number = tabAreaY1 + 261;
        return this.ingame && this.mouseX >= tabAreaX1 && this.mouseX <= tabAreaX2 && this.mouseY >= tabAreaY1 && this.mouseY <= tabAreaY2;
    };

    private insideUsernameArea() {
        // 261 x 17
        const usernameAreaX1: number = 301;
        const usernameAreaY1: number = 262;
        const usernameAreaX2: number = usernameAreaX1 + 261;
        const usernameAreaY2: number = usernameAreaY1 + 17;
        return !this.ingame && this.getTitleScreenState() === 2 && this.mouseX >= usernameAreaX1 && this.mouseX <= usernameAreaX2 && this.mouseY >= usernameAreaY1 && this.mouseY <= usernameAreaY2;
    };

    private inPasswordArea() {
        // 261 x 17
        const passwordAreaX1: number = 301;
        const passwordAreaY1: number = 279;
        const passwordAreaX2: number = passwordAreaX1 + 261;
        const passwordAreaY2: number = passwordAreaY1 + 17;
        return !this.ingame && this.getTitleScreenState() === 2 && this.mouseX >= passwordAreaX1 && this.mouseX <= passwordAreaX2 && this.mouseY >= passwordAreaY1 && this.mouseY <= passwordAreaY2;
    };

    private rotate(direction: number) {
        if (direction === 0) {
            this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight' }));
            this.onkeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft' }));
        } else if (direction === 1) {
            this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown' }));
            this.onkeydown(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp' }));
        } else if (direction === 2) {
            this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowLeft', code: 'ArrowLeft' }));
            this.onkeydown(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight' }));
        } else if (direction === 3) {
            this.onkeyup(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp' }));
            this.onkeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown' }));
        }
    };

    private isFullScreen() {
        return document.fullscreenElement !== null;
    };

    private setMousePosition(e: MouseEvent) {
        const fixedWidth: number = 789;
        const fixedHeight: number = 532;

        const canvasBounds: DOMRect = canvas.getBoundingClientRect();
        const clickLocWithinCanvas = {
            x: e.clientX - canvasBounds.left,
            y: e.clientY - canvasBounds.top
        };

        if (this.isFullScreen()) {
            // Fullscreen logic will ensure the canvas aspect ratio is
            // preserved, centering the canvas on the screen.
            const gameAspectRatio = fixedWidth / fixedHeight;
            const ourAspectRatio = window.innerWidth / window.innerHeight;

            // Determine whether our aspect ratio is wider than canvas' one.
            const wider = ourAspectRatio >= gameAspectRatio;

            let trueCanvasWidth = 0;
            let trueCanvasHeight = 0;
            let offsetX = 0;
            let offsetY = 0;

            if (wider) {
                // Browser will scale canvas according to _height_.
                trueCanvasWidth = window.innerHeight * gameAspectRatio;
                trueCanvasHeight = window.innerHeight;
                // As such, there will be a gap on the X axis either side.
                offsetX = (window.innerWidth - trueCanvasWidth) / 2;
            } else {
                // Browser will scale canvas according to _width_.
                trueCanvasWidth = window.innerWidth;
                trueCanvasHeight = window.innerWidth / gameAspectRatio;
                // As such, there will be a gap on the Y axis either side.
                offsetY = (window.innerHeight - trueCanvasHeight) / 2;
            }
            const scaleX = fixedWidth / trueCanvasWidth;
            const scaleY = fixedHeight / trueCanvasHeight;
            this.mouseX = ((clickLocWithinCanvas.x - offsetX) * scaleX) | 0;
            this.mouseY = ((clickLocWithinCanvas.y - offsetY) * scaleY) | 0;
        } else {
            const scaleX: number = canvas.width / canvasBounds.width;
            const scaleY: number = canvas.height / canvasBounds.height;
            this.mouseX = (clickLocWithinCanvas.x * scaleX) | 0;
            this.mouseY = (clickLocWithinCanvas.y * scaleY) | 0;
        }

        if (this.mouseX < 0) {
            this.mouseX = 0;
        }

        if (this.mouseY < 0) {
            this.mouseY = 0;
        }

        if (this.mouseX > fixedWidth) {
            this.mouseX = fixedWidth;
        }

        if (this.mouseY > fixedHeight) {
            this.mouseY = fixedHeight;
        }
    };

    private mapCoord(v: number, n1: number, n2: number, m1: number, m2: number) {
        return ((v - n1) * (m2 - m1)) / (n2 - n1) + m1;
    };
}
