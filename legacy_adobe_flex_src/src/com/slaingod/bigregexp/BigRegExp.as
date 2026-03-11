package com.slaingod.bigregexp
{
	public class BigRegExp
	{

		// Max chunkSize + maxGuaranteedResultSize is probably 32k
		private const chunkSize:int = 20000;
		
		// If you expect to get matchs with more than this number of chars, increase this, though performance will be reduce
		// as you will duplicate more of the search with each chunk.
		private const maxGuaranteedResultSize:int = 8192;
		
		private var re:RegExp;
		
		
		public function BigRegExp(pattern:*=null, options:*=null)
		{
			if(pattern is RegExp) 
				re = new RegExp(pattern);
			else
				re = new RegExp(pattern, options);
		}
		
		public function exec(s:String = ""):* {
			var offset:int = 0;
			var size:int = s.length;
			var sanity:int = -1;
			
      trace(new Date().toTimeString() + " -> BIGREGEXP:" + re.toString());
      
      try {
      
  			while(offset < size) {
  				var chunk:String = s.slice(offset, Math.min(size + 1, offset + chunkSize + maxGuaranteedResultSize)) 
  				var r:Array = re.exec(chunk);
  				  				
  				if(r) {
  					// We need to make sure that we got all of the text necessary. Occasionaly a .* type query will reach to the end
  					// of the chunk. If we do hit the end of the chunk we need to back up to the beginning of the match, get a new chunk and try again.
  					
  					var end:int = r.index + r[0].length
  					if(end == chunkSize + maxGuaranteedResultSize) {
  						if(sanity == offset) {
  							// avoid infinite recursion 							
  						} else {
  							offset = offset + r.index;
  							sanity = offset;
  							continue;
  						}
  					}
  					
  					r.index += offset;
  					return r;
  				}
  				offset += (chunkSize - maxGuaranteedResultSize); // - 2000 allows for some overlap
  			}
  			return null;
      } finally {
        trace(new Date().toTimeString() + " <- BIGREGEXP:" + re.toString());
      }
      
		}
	}
}