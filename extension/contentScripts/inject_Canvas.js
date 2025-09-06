(function() {
    //random noise
    const randNoise = () => (Math.random()-0.5)*0.1;

    //select random pixel
    function randPixel(data){
        const pixelCount = Math.floor(data.length/4);
        if (pixelCount<0) return;

        const idx = Math.floor(Math.random*pixelCount)*4;
        data[idx+0] += randNoise(); //red channel
        data[idx+1] += randNoise(); // green  channel
        data[idx+2] += randNoise();//blue channel
    }

    const origToDataUrl = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
        try {
            const ctx = this.getContext('2d');
            if(ctx) {
                const {width: w, height: h} = this;
                const imgData = ctx.getImageData(0,0,h,w);
                randPixel(imgData.data);
                ctx.putImageData(imgData,0,0);
            }
        }catch(e){

        }
        return origToDataUrl.apply(this,args);
    };

    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args){
        const result = origGetImageData.apply(this,args);
        try{
            randPixel(result.data)
        }catch(e){

        }
        return result;
    };
    console.log("Random Noise added to Canvas");

})();
