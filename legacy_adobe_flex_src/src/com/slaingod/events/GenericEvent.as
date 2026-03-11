package com.slaingod.events {
	
	import flash.events.Event;
	
	public class GenericEvent extends Event {
		
		public static var EVENT_PREFIX:String = "GenericEvent";
	
		public var eventType:String;
		public var data:*;
	
		public function GenericEvent(type:String, data:Object = null, bubbles:Boolean = true, cancelable:Boolean = true) {
			eventType = type;
			super(EVENT_PREFIX + type, bubbles, cancelable);
			this.data = data;
		}
		
		public static function EVENT(type:String):String {
			return EVENT_PREFIX + type;
		}
		
	}
}				