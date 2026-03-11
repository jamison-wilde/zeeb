package com.slaingod.FastDirectorySystemTree
{
  
  /* Inspired by http://blog.webdeely.com/2009/07/fixing-the-filesystemtree/ */
  
  import flash.filesystem.File;
  
  import mx.collections.ArrayCollection;
  import mx.collections.Sort;
  import mx.controls.FileSystemTree;
  import mx.controls.fileSystemClasses.FileSystemTreeDataDescriptor;
  import mx.core.mx_internal;
  import mx.utils.DirectoryEnumerationMode;
  
  use namespace mx_internal;
  
  public class FastDirectorySystemTree extends FileSystemTree
  {

    private static var commonFiletypes:Array = ['txt','nfo','jpg','url', 'png', 
      'par2','mp3','flac','m3u','exe','bat','7z','pdf', 'zip','doc','ttf',
      'rar','r00','r01','r02','r03','r04','r05','r06','r07','r08','r09',
      'r10','r11','r12','r13','r14','r15','r16','r17','r18','r19',
      'r20','r21','r22','r23','r24','r25','r26','r27','r28','r29',
      'r30','r31','r32','r33','r34','r35','r36','r37','r38','r39',
      'r40','r41','r42','r43','r44','r45','r46','r47','r48','r49',
      'r50','r51','r52','r53','r54','r55','r56','r57','r58','r59',
      'r60','r61','r62','r63','r64','r65','r66','r67','r68','r69',
      'r70','r71','r72','r73','r74','r75','r76','r77','r78','r79',
      'r80','r81','r82','r83','r84','r85','r86','r87','r88','r89',
      'r90','r91','r92','r93','r94','r95','r96','r97','r98','r99',
      'mkv','avi','wmv','mp4','m4v','mov','ts','m2ts','ogm', 'mpg', 
      'mpeg', 'flv', 'iso', 'rmvb','torrent'
    ];
    
    override mx_internal function insertChildItems(subdirectory:File, childItems:Array):void
    {
      var childCollection:ArrayCollection;
      // speed up our directory only tree      
      if(enumerationMode == DirectoryEnumerationMode.DIRECTORIES_ONLY) {
        childCollection = new ArrayCollection();
        for each (var item:File in childItems) {
          // isDirectory is incredibly slow, especially over a network.
          // It appears flash lazy loads that and other attributes like size
          // Our strategy is to weed out common files to minimize the number of calls to isDirectory in the fileFilterFunction call 
          if((item.extension == null || commonFiletypes.indexOf(item.extension) == -1))
            childCollection.addItem(item)
        }
      } else {
        childCollection = new ArrayCollection(childItems);
      }
      
      childCollection.sort = new Sort();
      childCollection.sort.compareFunction = helper.directoryEnumeration.fileCompareFunction;
      childCollection.filterFunction = helper.directoryEnumeration.fileFilterFunction;
      childCollection.refresh();
      
      FileSystemTreeDataDescriptor(dataDescriptor).setChildren(
        subdirectory, childCollection);
      
      expandItem(subdirectory, true, true);
      
      helper.itemsChanged();
    }

  }
}