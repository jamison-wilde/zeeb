package com.slaingod.util
{

	public class ArrayUtil
	{
//		include "../core/Version.as";
//		import mx.core.mx_internal;
//		mx_internal static const VERSION:String = "3.2.0.3958";
	
		import mx.collections.ArrayCollection;
		
    /**
     *  Ensures that an Object can be used as an Array.
     * Differs from Adobe version in that ArrayCollection is also converted to array
     * instead of just putting the ArrayCollection as an item in the new array
     */
    public static function toArray(obj:Object):Array
    {
			if (!obj) 
				return [];
			else if (obj is Array)
				return obj as Array;
			else if (obj is ArrayCollection)
				return obj.toArray();
			else
			 	return [ obj ];
    }
    
    /* included to be compatible with Adobe's */
    public static function getItemIndex(item:Object, source:Array):int
    {
	    var n:int = source.length;
	    for (var i:int = 0; i < n; i++)
	    {
	        if (source[i] === item)
	            return i;
	    }
	    return -1;           
    }
	}
}
