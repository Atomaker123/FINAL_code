let then = Date.now();
export function animate(getFps, cb) {
    
    if (stop) {
        return;
    }
    const fps = getFps();
    let fpsInterval = 1000 / fps;
    
    requestAnimationFrame(() => animate(getFps, cb));
    
    const now = Date.now();
    let elapsed = now - then;
    
    if (elapsed > fpsInterval) {
        
        
        then = now - (elapsed % fpsInterval);
        
        cb();
    }
}
