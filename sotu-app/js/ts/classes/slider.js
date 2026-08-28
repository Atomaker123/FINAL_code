import { Graphics, Container, Point, Ticker } from "pixi.js-legacy";
import { E } from "../helpers/e";
import { Tweenable } from 'shifty';
var AutopilotDirection;
(function (AutopilotDirection) {
    AutopilotDirection[AutopilotDirection["FORWARD"] = 0] = "FORWARD";
    AutopilotDirection[AutopilotDirection["BACKWARD"] = 1] = "BACKWARD";
})(AutopilotDirection || (AutopilotDirection = {}));
const Stats = require('stats-js');
const WIDTH_PERCENT = 0.9;
const HEIGHT_PERCENT = 0.05;
const BOTTOM_MARGIN = 100;
const HANDLE_WIDTH_PERCENT = 0.04;
const BORDER_RADIUS = 15;
const SCROLL_SPEED = -1.5;
let MAX_SCROLL_SPEED = 3; 
let EASING_CONSTANT = 0.005;
export class Slider {
    constructor(app, w, h, globalRes, onChange, onHandleClicked) {
        this.dragging = false;
        this.fpsTarget = 200;
        this.interaction = false;
        this.mouseDown = false;
        this.autopilot = false;
        this.autopilotDir = null;
        this.startOffset = 0;
        this.app = app;
        this.onChange = onChange;
        this.onHandleClicked = onHandleClicked;
        this.w = w / globalRes;
        this.h = h / globalRes;
        this.tweenable = new Tweenable();
        this.container = new Container();
        this.widthPixels = this.w * WIDTH_PERCENT;
        this.handleWidthPixels = this.w * HANDLE_WIDTH_PERCENT;
        this.scaleWidthPixels = this.widthPixels - this.handleWidthPixels;
        this.margin = (this.w - this.widthPixels) / 2; 
        document.addEventListener("mousewheel", (e) => {
            var e = window.event || e; 
            var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            this.startOffset = 0;
            this.interact();
            this.moveTarget(delta * SCROLL_SPEED);
        }, false);
    }
    init() {
        let background = this.backGround();
        let handle = this.handle();
        this.container.removeChildren();
        this.container.addChild(background, handle);
        return this.container;
    }
    backGround() {
        const graphics = new Graphics();
        graphics.lineStyle(2, 0xaaaaaa, 0);
        graphics.beginFill(0xffffff, 1);
        graphics.lineStyle(2, 0xaaaaaa, 1);
        graphics.beginFill(0x666666, .5);
        const w = this.widthPixels;
        const h = this.h * HEIGHT_PERCENT;
        const x = this.margin;
        const y = this.h - h - BOTTOM_MARGIN;
        this.topY = y;
        graphics.drawRoundedRect(x, y, w, h, h / 2);
        const widthPixels = this.w;
        const handleWidthPixels = this.w * HANDLE_WIDTH_PERCENT;
        const scaleWidthPixels = widthPixels - handleWidthPixels / 2;
        graphics.lineStyle(3, 0x00ff00, 1);
        graphics.lineStyle(3, 0x0000ff, 1);
        graphics.cacheAsBitmap = true;
        return graphics;
    }
    forwardAutopilot() {
        if (this.autopilotDir === AutopilotDirection.FORWARD)
            return this.terminateAutopilot();
        const forward = document.getElementById('autoForward');
        const forwardImg = document.getElementById('forwardImage');
        const backwardImg = document.getElementById('backwardImage');
        if (this.autopilotDir === AutopilotDirection.BACKWARD || !this.autopilotDir) {
            this.autopilotInterval ? clearInterval(this.autopilotInterval) : '';
            this.autopilotDir = AutopilotDirection.FORWARD;
            this.autopilot = true;
            console.log('hi');
            forwardImg.classList.add('sideSine');
            backwardImg.classList.remove('sideSine');
            this.autopilotInterval = setInterval(() => {
                this.setPercent(this.currentPercent + .000005);
            }, 5);
        }
    }
    backwardAutopilot() {
        if (this.autopilotDir === AutopilotDirection.BACKWARD)
            return this.terminateAutopilot();
        const backward = document.getElementById('autoBackward');
        const backwardImg = document.getElementById('backwardImage');
        const forwardImg = document.getElementById('forwardImage');
        if (this.autopilotDir === AutopilotDirection.FORWARD || !this.autopilotDir) {
            this.autopilotInterval ? clearInterval(this.autopilotInterval) : '';
            this.autopilotDir = AutopilotDirection.BACKWARD;
            backwardImg.classList.add('sideSine');
            forwardImg.classList.remove('sideSine');
            this.autopilot = true;
            this.autopilotInterval = setInterval(() => {
                this.setPercent(this.currentPercent - .000005);
            }, 5);
        }
    }
    terminateAutopilot() {
        const forward = document.getElementById('autoForward');
        const backward = document.getElementById('autoBackward');
        const forwardImg = document.getElementById('forwardImage');
        const backwardImg = document.getElementById('backwardImage');
        this.autopilotDir = null;
        this.autopilot = false;
        forwardImg.classList.remove('sideSine');
        backwardImg.classList.remove('sideSine');
        if (this.autopilotInterval) {
            clearInterval(this.autopilotInterval);
            this.autopilotInterval = null;
        }
    }
    handle() {
        const forward = document.getElementById('autoForward');
        forward.addEventListener('click', event => {
            this.forwardAutopilot();
        });
        const backward = document.getElementById('autoBackward');
        backward.addEventListener('click', event => {
            this.backwardAutopilot();
        });
        var graphics = new Graphics();
        graphics.interactive = true;
        graphics.lineStyle(0, 0xaaaaaa, 0);
        graphics.beginFill(0xffffff, 1);
        const w = this.w * HANDLE_WIDTH_PERCENT;
        this.handleW = w;
        const h = this.h * HEIGHT_PERCENT;
        const x = this.w / 2 + w / 2;
        this.currentX = x;
        this.targetX = x;
        const y = this.h - h - BOTTOM_MARGIN;
        graphics.drawRoundedRect(0, 0, w, h, h / 2);
        graphics.lineStyle(3, 0xff0000, 1);
        graphics.endFill();
        graphics.lineStyle(3, 0xff00ff, 1);
        graphics.position = new Point(x, y);
        graphics.cacheAsBitmap = true;
        graphics
            .on("mousedown", onDragStart)
            .on("touchstart", onDragStart)
            .on("mouseup", onDragEnd)
            .on("mouseupoutside", onDragEnd)
            .on("touchend", onDragEnd)
            .on("touchendoutside", onDragEnd)
            .on("mousemove", onDragMove)
            .on("touchmove", onDragMove);
        let here = this;
        function onDragStart(event) {
            this.startOffset = event.data.global.x - here.handleGfx.position.x;
            here.interact();
            this.data = event.data;
            this.alpha = 0.75;
            this.dragging = true;
            this.fpsTarget = 200;
            here.onHandleClicked();
            here.dragging = true;
        }
        function onDragEnd() {
            this.alpha = 1;
            this.dragging = false;
            here.dragging = false;
            here.interact();
            let diff = here.currentX - here.targetX;
            let dir = diff / Math.abs(diff);
            let newDiff = diff / 3;
            if (Math.abs(diff) > (here.w / 10)) {
                here.setTarget(here.currentX - newDiff);
            }
            this.data = null;
        }
        let width = this.w;
        let that = this;
        function onDragMove() {
            here.interact();
            if (this.dragging) {
                var newX = this.data.getLocalPosition(this.parent).x;
                that.setTarget(newX - this.startOffset);
            }
        }
        this.handleGfx = graphics;
        this.handleAnim();
        return graphics;
    }
    setTarget(x) {
        this.terminateAutopilot();
        if (x < 0) {
            x = 0;
        }
        this.targetX = x;
    }
    setTargetPercent(percent) {
        this.terminateAutopilot();
        if (percent < 0) {
            percent = 0;
        }
        MAX_SCROLL_SPEED = 9;
        EASING_CONSTANT = 0.1;
    }
    interact() {
        this.interaction = true;
        Ticker.shared.start();
        Ticker.shared.speed = 1;
    }
    setAnimationTargetPercent(targetPercent) {
        this.terminateAutopilot();
        if (!this.tweenable.isPlaying()) {
            const deltaPercent = Math.abs(this.currentPercent - targetPercent);
            const duration = Math.min(Math.max(50000 * deltaPercent, 250), 1000);
            this.tweenable.setConfig({
                from: { pos: this.currentPercent },
                to: { pos: targetPercent },
                easing: 'easeInOutSine',
                duration,
                step: state => this.setPercent(state.pos)
            });
            this.tweenable.tween().then(() => { });
        }
    }
    animStopped() {
        EASING_CONSTANT = .025;
        MAX_SCROLL_SPEED = 3;
    }
    setPercent(percent) {
        if (percent < 0) {
            percent = 0;
        }
        this.currentX = this.scaleWidthPixels * percent + this.margin;
        this.targetX = this.scaleWidthPixels * percent + this.margin;
        this.handleGfx.position.x = this.currentX;
        this.onChange(0, percent);
    }
    moveTarget(x) {
        if (this.targetX + x > 0) {
            this.targetX += x;
        }
    }
    handleAnim() {
        let frameCount = 0;
        let prevDX = 0;
        let ticker = Ticker.shared;
        ticker.add((deltaTime) => {
            if (!this.tweenable.isPlaying()) {
                let dX = (this.targetX - this.currentX) * deltaTime; 
                const widthPixels = this.w * WIDTH_PERCENT;
                const handleWidthPixels = this.w * HANDLE_WIDTH_PERCENT;
                const scaleWidthPixels = widthPixels - handleWidthPixels;
                const margin = (this.w - widthPixels) / 2; 
                const leftBound = margin + handleWidthPixels / 2; 
                const rightBound = margin + widthPixels - handleWidthPixels / 2; 
                let dXScaled = dX * EASING_CONSTANT;
                const dir = dXScaled / Math.abs(dXScaled);
                if (Math.abs(dXScaled) > MAX_SCROLL_SPEED) {
                    dXScaled = MAX_SCROLL_SPEED * dir;
                }
                const newX = this.currentX + dXScaled;
                const adjX = newX + handleWidthPixels / 2;
                const insideLeft = leftBound < adjX;
                const insideRight = adjX < rightBound;
                let changed = Math.abs(dXScaled) > .01;
                let newPosition = this.currentX;
                if (insideLeft && insideRight && changed) {
                    newPosition = newX;
                    this.currentX = newX;
                }
                if (adjX > rightBound + 5) {
                    newPosition = rightBound - 1 - handleWidthPixels / 2;
                    this.currentX = rightBound - 1 - handleWidthPixels / 2;
                }
                this.handleGfx.position.x = newPosition;
                let percent = (newPosition - margin) / (scaleWidthPixels);
                percent = Math.floor(percent * E(7)) / E(7);
                this.currentPercent = percent;
                if (changed) {
                    this.onChange(newPosition, percent);
                }
                else {
                    if (this.interaction) {
                    }
                    if (!this.dragging) {
                    }
                    this.animStopped();
                }
                prevDX = dXScaled; 
            }
        });
    }
}