import { test, expect } from "@playwright/test";
import { load, menu } from "./helpers";

type IntroTrace = { phases: string[]; clipped: string[]; samples: number; done: boolean };
declare global { interface Window { __introTrace: IntroTrace; } }

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1920, height: 900 }]) {
  test(`whole intro remains visible through every phase at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await load(page);
    await menu(page);
    // Observe inside the browser, beginning before model initialization. Remote
    // locator calls and screenshots can exceed the 900ms settle phase on CI.
    // All four real phases and the same strict model bounds remain required.
    await page.evaluate(({width,height}) => {
      const trace: IntroTrace = window.__introTrace = {phases:[],clipped:[],samples:0,done:false};
      const sample = () => {
        const screen=document.querySelector('.app')?.getAttribute('data-screen');
        if(screen==='game'){trace.done=true;return;}
        if(screen==='stageIntro' && window.__boneProbe){
          const pieces=window.__boneProbe.snapshot();
          if(Object.keys(pieces).length===27){
            const caption=document.querySelector('.intro-subtitle')?.textContent;
            const phase=document.querySelector('.stage-typography')?'typography':caption?.includes('extraordinary')?'assembled':caption?.includes('Every structure')?'falling':'settling';
            if(!trace.phases.includes(phase))trace.phases.push(phase);
            trace.samples++;
            for(const [id,piece] of Object.entries(pieces)){
              const b=piece.bounds;
              if(b.left<0||b.right>width||b.top<60||b.bottom>height-120)
                if(trace.clipped.length<20)trace.clipped.push(`${phase}: ${id} ${JSON.stringify(b)}`);
            }
          }
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    },viewport);
    await page.getByRole("button", { name: "Start HAND", exact: true }).click();
    await page.waitForFunction(()=>window.__introTrace.done);
    const trace=await page.evaluate(()=>window.__introTrace);
    await test.info().attach('intro-frame-bounds',{body:JSON.stringify(trace,null,2),contentType:'application/json'});
    expect(trace.phases.sort()).toEqual(['assembled','falling','settling','typography']);
    expect(trace.samples).toBeGreaterThan(4);
    expect(trace.clipped, "model bounds must stay above the subtitle and skip controls").toEqual([]);
  });
}
