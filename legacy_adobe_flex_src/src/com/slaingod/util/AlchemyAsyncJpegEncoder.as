package com.slaingod.util
{
  import cmodule.aircall.CLibInit;
  import cmodule.aircall.MState;
  import cmodule.aircall.gstate;
  
  import com.pfp.events.JPEGAsyncCompleteEvent;
  
  import flash.display.BitmapData;
  import flash.events.EventDispatcher;
  import flash.utils.ByteArray;

  
  // http://segfaultlabs.com/swf/alchemy/alchemyJpeg2.swf
  
  public class AlchemyAsyncJpegEncoder extends EventDispatcher
  {
    private var _quality:int;
    private var _ms:int;
    
    private var _init:CLibInit;
    private var _lib:Object; 
    
    private var uncompressedImageByteArray:ByteArray = new ByteArray();
    private var compressedImageByteArray:ByteArray = new ByteArray();
    
    public function AlchemyAsyncJpegEncoder(quality:int = 90, ms:int = 50):void
    {
      _quality = quality;
      _ms = ms;
      _init = new CLibInit()
      _lib = _init.init();
    }
    
    public function encode(bitmapData:BitmapData):void
    {
      compressedImageByteArray.clear();
      uncompressedImageByteArray.clear();
      uncompressedImageByteArray = bitmapData.getPixels(bitmapData.rect);
      uncompressedImageByteArray.position = 0;
      
      _lib.encodeAsync( compressFinished, uncompressedImageByteArray, compressedImageByteArray, bitmapData.width, bitmapData.height, _quality, _ms );
//      _lib.encodeAsync( compressFinished, bitmapData.getPixels(bitmapData.rect), bitmapData.width, bitmapData.height, _quality, _ms );
    };
    
    private function compressFinished( out:ByteArray = null ):void			
    {
      compressedImageByteArray.position = 0;
//      out.position = 0;
      dispatchEvent(new JPEGAsyncCompleteEvent(compressedImageByteArray));
    }
  }
}