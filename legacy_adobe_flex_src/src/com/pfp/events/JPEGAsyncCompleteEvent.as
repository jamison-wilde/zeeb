package com.pfp.events
{
	import flash.events.Event;
	import flash.utils.ByteArray;

	public class JPEGAsyncCompleteEvent extends Event
	{
		public static const JPEGASYNC_COMPLETE:String = "JPEGAsyncComplete";
		
		public var data:ByteArray;
		
		public function JPEGAsyncCompleteEvent(data:ByteArray)
		{
			this.data = data;
			super(JPEGASYNC_COMPLETE);		
		}
	}
}