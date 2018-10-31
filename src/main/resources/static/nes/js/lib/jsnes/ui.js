/*
JSNES, based on Jamie Sanders' vNES
Copyright (C) 2010 Ben Firshman

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

JSNES.DummyUI = function(nes) {
    this.nes = nes;
    this.enable = function() {};
    this.updateStatus = function() {};
    this.writeAudio = function() {};
    this.writeFrame = function() {};
};

if (typeof jQuery !== 'undefined') {
    (function($) {
        $.fn.JSNESUI = function(roms) {
            var parent = this;
            var UI = function(nes) {
                var self = this;
                self.nes = nes;
                
                /*
                 * Create UI
                 */
                self.root = $('<div></div>');
                self.screen = $('<canvas class="nes-screen" width="256" height="240"></canvas>').appendTo(self.root);
                
                if (!self.screen[0].getContext) {
                    parent.html("请使用支持html5 canves的浏览器打开本页面！");
                    return;
                }
                
                self.romContainer = $('<div class="nes-roms"></div>').appendTo(self.root);
                self.romSelect = $('<select></select>').appendTo(self.romContainer);
                
                self.controls = $('<div class="nes-controls"></div>').appendTo(self.root);
                self.buttons = {
                    pause: $('<input type="button" value="暂停" class="nes-pause" disabled="disabled" />').appendTo(self.controls),
                    restart: $('<input type="button" value="重置" class="nes-restart" disabled="disabled" />').appendTo(self.controls),
                    sound: $('<input type="button" value="打开声音" class="nes-enablesound" />').appendTo(self.controls),
                    zoom: $('<input type="button" value="放大" class="nes-zoom" />').appendTo(self.controls)
                };
                self.status = $('<p class="nes-status" style="display:none;">启动中...</p>').appendTo(self.root);
                self.root.appendTo(parent);
                
                /*
                 * ROM loading
                 */
                self.romSelect.change(function() {
                    self.loadROM();
                });
                
                /*
                 * Buttons
                 */
                self.buttons.pause.click(function() {
                    if (self.nes.isRunning) {
                        self.nes.stop();
                        self.updateStatus("暂停中...");
                        self.buttons.pause.attr("value", "继续");
                    }
                    else {
                        self.nes.start();
                        self.buttons.pause.attr("value", "暂停");
                    }
                });
        
                self.buttons.restart.click(function() {
                    self.nes.reloadRom();
                    self.nes.start();
                });
        
                self.buttons.sound.click(function() {
                    if (self.nes.opts.emulateSound) {
                        self.nes.opts.emulateSound = false;
                        self.buttons.sound.attr("value", "开启声音");
                    }
                    else {
                        self.nes.opts.emulateSound = true;
                        self.buttons.sound.attr("value", "关闭声音");
                    }
                });
        
                self.zoomed = 1;
                self.buttons.zoom.click(function() {
                    if (self.zoomed == 4) {
                        /*self.screen.animate({
                            width: '256px',
                            height: '240px'
                        });*/
                    	//$(self.screen).width(256).height(240);;
                    	self.screen[0].width = 256;
                    	self.screen[0].height = 240;
                        self.buttons.zoom.attr("value", "x1");
                        self.zoomed = 1;
                    }else if(self.zoomed == 1){
                    	
                    	console.log(self.screen);
                    	self.screen[0].width = 512;
                    	self.screen[0].height = 480;
                        /*self.screen.animate({
                            width: '512px',
                            height: '480px'
                        });*/
                    	//$(self.screen).width(512).height(480);;
                        self.buttons.zoom.attr("value", "x2");
                        self.zoomed = 2;
                    }else if(self.zoomed == 2){
                        /*self.screen.animate({
                            width: '1024px',
                            height: '960px'
                        });*/
                    	self.screen[0].width = 1024;
                    	self.screen[0].height = 960;
                    	//$(self.screen).width(1024).height(960);;
                        self.buttons.zoom.attr("value", "x4");
                        self.zoomed = 4;
                    }
                    self.canvasImageData = self.canvasContext.getImageData(0, 0, self.screen.width(), self.screen.height());
                    self.resetCanvas();
                });
                
                /*
                 * Lightgun experiments with mouse
                 * (Requires jquery.dimensions.js)
                 */
                if ($.offset) {
                    self.screen.mousedown(function(e) {
                        if (self.nes.mmap) {
                            self.nes.mmap.mousePressed = true;
                            // FIXME: does not take into account zoom
                            self.nes.mmap.mouseX = e.pageX - self.screen.offset().left;
                            self.nes.mmap.mouseY = e.pageY - self.screen.offset().top;
                        }
                    }).mouseup(function() {
                        setTimeout(function() {
                            if (self.nes.mmap) {
                                self.nes.mmap.mousePressed = false;
                                self.nes.mmap.mouseX = 0;
                                self.nes.mmap.mouseY = 0;
                            }
                        }, 500);
                    });
                }
            
                if (typeof roms != 'undefined') {
                    self.setRoms(roms);
                }
            
                /*
                 * Canvas
                 */
                self.canvasContext = self.screen[0].getContext('2d');
                
                if (!self.canvasContext.getImageData) {
                    parent.html("请使用支持html5 canves的浏览器打开本页面！");
                    return;
                }
                
                self.canvasImageData = self.canvasContext.getImageData(0, 0, self.screen.width(), self.screen.height());
                self.resetCanvas();
            
                /*
                 * Keyboard
                 */
                $(document).
                    bind('keydown', function(evt) {
                        self.nes.keyboard.keyDown(evt); 
                    }).
                    bind('keyup', function(evt) {
                        self.nes.keyboard.keyUp(evt); 
                    }).
                    bind('keypress', function(evt) {
                        self.nes.keyboard.keyPress(evt);
                    });
            
                /*
                 * Sound
                 */
                self.dynamicaudio = new DynamicAudio({
                    swf: nes.opts.swfPath+'dynamicaudio.swf'
                });
            };
        
            UI.prototype = {    
                loadROM: function() {
                    var self = this;
                    self.updateStatus("正在载入中...");
                    $.ajax({
                        url: escape(self.romSelect.val()),
                        xhr: function() {
                            var xhr = $.ajaxSettings.xhr();
                            if (typeof xhr.overrideMimeType !== 'undefined') {
                                // Download as binary
                                xhr.overrideMimeType('text/plain; charset=x-user-defined');
                            }
                            self.xhr = xhr;
                            return xhr;
                        },
                        complete: function(xhr, status) {
                            var i, data;
                            if (JSNES.Utils.isIE()) {
                                var charCodes = JSNESBinaryToArray(
                                    xhr.responseBody
                                ).toArray();
                                data = String.fromCharCode.apply(
                                    undefined, 
                                    charCodes
                                );
                            }
                            else {
                                data = xhr.responseText;
                            }
                            self.nes.loadRom(data);
                            self.nes.start();
                            self.enable();
                        }
                    });
                },
                
                resetCanvas: function(width,height) {
                    this.canvasContext.fillStyle = 'black';
                    // set alpha to opaque
                    this.canvasContext.fillRect(0, 0, width, height);

                    // Set alpha
                    for (var i = 3; i < this.canvasImageData.data.length-3; i += 4) {
                        this.canvasImageData.data[i] = 0xFF;
                    }
                },
                
                /*
                *
                * nes.ui.screenshot() --> return <img> element :)
                */
                screenshot: function() {
                    var data = this.screen[0].toDataURL("image/png"),
                        img = new Image();
                    img.src = data;
                    return img;
                },
                
                /*
                 * Enable and reset UI elements
                 */
                enable: function() {
                    this.buttons.pause.attr("disabled", null);
                    if (this.nes.isRunning) {
                        this.buttons.pause.attr("value", "暂停");
                    }
                    else {
                        this.buttons.pause.attr("value", "继续");
                    }
                    this.buttons.restart.attr("disabled", null);
                    if (this.nes.opts.emulateSound) {
                        this.buttons.sound.attr("value", "关闭声音");
                    }
                    else {
                        this.buttons.sound.attr("value", "开启声音");
                    }
                },
            
                updateStatus: function(s) {
                    this.status.text(s);
                },
        
                setRoms: function(roms) {
                    this.romSelect.children().remove();
                    $("<option>请选择一个nes rom...</option>").appendTo(this.romSelect);
                    for (var groupName in roms) {
                        if (roms.hasOwnProperty(groupName)) {
                            var optgroup = $('<optgroup></optgroup>').
                                attr("label", groupName);
                            for (var i = 0; i < roms[groupName].length; i++) {
                                $('<option>'+roms[groupName][i][0]+'</option>')
                                    .attr("value", roms[groupName][i][1])
                                    .appendTo(optgroup);
                            }
                            this.romSelect.append(optgroup);
                        }
                    }
                },
            
                writeAudio: function(samples) {
                    return this.dynamicaudio.writeInt(samples);
                },
                mysetData: function(imageData,j,pixel){
                	imageData[j] = pixel & 0xFF;
                    imageData[j+1] = (pixel >> 8) & 0xFF;
                    imageData[j+2] = (pixel >> 16) & 0xFF;
                    //imageData[j+3] = 0x00;
                },
                writeFrame: function(buffer, prevBuffer) {
                    var imageData = this.canvasImageData.data;
                    var pixel, i, j;
                    var data = [];
                    var mysetData = function(_imageData,_j,_pixel){
                    	_imageData[_j] = _pixel & 0xFF;
                        _imageData[_j+1] = (_pixel >> 8) & 0xFF;
                        _imageData[_j+2] = (_pixel >> 16) & 0xFF;
                    }
                    for (i=0; i<256*240; i++) {
                        pixel = buffer[i];
                        var y = parseInt(i/256);
                        var x = i%256;
                       // if (pixel != prevBuffer[i]) {
                            j = i*4;
                            //缩放
                            if(this.zoomed==1){
                            	mysetData(imageData,j,pixel);
                            }else if(this.zoomed==2){
                            	mysetData(imageData,y*256*4*4+x*4*2,pixel);
                            	mysetData(imageData,y*256*4*4+x*4*2+4,pixel);
                            	mysetData(imageData,y*256*4*4+256*4*2+x*4*2,pixel);
                            	mysetData(imageData,y*256*4*4+256*4*2+x*4*2+4,pixel);
                            }else if(this.zoomed==4){
                            	mysetData(imageData,y*256*4*16+x*4*4,pixel);
                            	mysetData(imageData,y*256*4*16+x*4*4+4,pixel);
                            	mysetData(imageData,y*256*4*16+x*4*4+8,pixel);
                            	mysetData(imageData,y*256*4*16+x*4*4+12,pixel);
                            	
                            	mysetData(imageData,y*256*4*16+256*4*4+x*4*4,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4+x*4*4+4,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4+x*4*4+8,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4+x*4*4+12,pixel);
                            	
                            	mysetData(imageData,y*256*4*16+256*4*4*2+x*4*4,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4*2+x*4*4+4,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4*2+x*4*4+8,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4*2+x*4*4+12,pixel);
                            	
                            	mysetData(imageData,y*256*4*16+256*4*4*3+x*4*4,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4*3+x*4*4+4,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4*3+x*4*4+8,pixel);
                            	mysetData(imageData,y*256*4*16+256*4*4*3+x*4*4+12,pixel);
                            	
                            	/*mysetData(imageData,j*4,pixel);
                            	mysetData(imageData,j*4+4,pixel);
                            	mysetData(imageData,j*4+8,pixel);
                            	mysetData(imageData,j*4+12,pixel);
                            	mysetData(imageData,j*4+256*4*4,pixel);
                            	mysetData(imageData,j*4+256*4*4+4,pixel);
                            	mysetData(imageData,j*4+256*4*4+8,pixel);
                            	mysetData(imageData,j*4+256*4*4+12,pixel);
                            	mysetData(imageData,j*4+256*4*8,pixel);
                            	mysetData(imageData,j*4+256*4*8+4,pixel);
                            	mysetData(imageData,j*4+256*4*8+8,pixel);
                            	mysetData(imageData,j*4+256*4*8+12,pixel);
                            	mysetData(imageData,j*4+256*4*12,pixel);
                            	mysetData(imageData,j*4+256*4*12+4,pixel);
                            	mysetData(imageData,j*4+256*4*12+8,pixel);
                            	mysetData(imageData,j*4+256*4*12+12,pixel);*/
                            }
                            
                            prevBuffer[i] = pixel;
                        //}
                    }
                    
                    this.canvasContext.putImageData(this.canvasImageData, 0, 0);
                }
            };
        
            return UI;
        };
    })(jQuery);
}
