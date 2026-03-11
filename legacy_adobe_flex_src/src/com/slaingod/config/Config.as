package com.slaingod.config
{
	import com.slaingod.util.ArrayUtil;
	
	import flash.display.NativeWindowDisplayState;
	import flash.filesystem.File;
	import flash.filesystem.FileMode;
	import flash.filesystem.FileStream;
	import flash.xml.XMLDocument;
	import flash.xml.XMLNode;
	
	import mx.controls.Alert;
	import mx.rpc.xml.SimpleXMLDecoder;
	import mx.rpc.xml.SimpleXMLEncoder;
	import mx.utils.ObjectProxy;
	
	public class Config extends Object
	{
		
		private var xml:XML;

		[Bindable]
		public var preferencesVersion:int = 22;

		[Bindable]
		public var showBrowser:Boolean = true;

		[Bindable]
		public var separateDVDFolderFormat:Boolean = false;
		
		[Bindable]
		public var separatePosterFormat:Boolean = false;

		[Bindable]
		public var separateURLFormat:Boolean = false;

		[Bindable]
		public var smallFileCopyLimit:int = 1024;
		
		[Bindable]
		public var includeNFOinURLFile:Boolean = true;

    [Bindable]
    public var deleteOriginalNFO:Boolean = true;
    
		[Bindable]
		public var includeOriginalMovieFilenameinURLFile:Boolean = true;
		
		[Bindable]
		public var posterInDVDFolder:Boolean = false;
		
		[Bindable]
		public var detectDVDs:Boolean = true;

		[Bindable]
		public var releaseNotesShownForVersion:String = '';

		[Bindable]
		public var autoUpdateMessageShown:Boolean = false;

		[Bindable]
		public var autoSelectFirstMovie:Boolean = false;

		[Bindable]
		public var versionForStartupMessage:String = '';
		
		[Bindable]
		public var checkForUpdates:Boolean = true;
		
		[Bindable]
		public var logfileLocation:String = '';
		
		[Bindable]
		public var downloadPosters:Boolean = true;
		
		[Bindable]
		public var showPartIcons:Boolean = true;

		[Bindable]
		public var showHiddenFiles:Boolean = true;
		
		[Bindable]
		public var maxUndos:int = 200;

		[Bindable]
		public var savedPartSeparator:String = '.';

    [Bindable]
    public var starsSeparator:String = ', ';

    [Bindable]
    public var genresSeparator:String = ', ';

    [Bindable]
    public var directorsSeparator:String = ', ';

    [Bindable]
    public var rdirectorsSeparator:String = '; ';

		[Bindable]
		public var removeThe:Boolean = false;

    [Bindable]
    public var replaceTitleSpacesWith:String = '';
    
    [Bindable]
    public var the:String = 'The';
    
    [Bindable]
    public var swapThe:Boolean = false;

		[Bindable]
		public var renameFolder:Boolean = false;
		
		[Bindable]
		public var recurseForMovies:String = 'only';
		
		[Bindable]
		public var htmlZoom:Number = 1.0;

		[Bindable]
		public var useTTFile:Boolean = false;

		[Bindable]
		public var showTTFile:Boolean = false;

		[Bindable]
		public var showSampleFile:Boolean = false;

		[Bindable]
		public var height:int = 768;
		
		[Bindable]
		public var width:int = 1024;
		
		[Bindable]
		public var maximized:Boolean = false;
		
		[Bindable]
		public var createURLFile:Boolean = true;
		
		[Bindable]
		public var renameFormat:String = '<title> (<year>).<imdb>(<rating100>).<saved>';

		[Bindable]
		public var renameAKAFormat:String = '<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>';

		[Bindable]
		public var renameFormatDVDFolder:String = '<title> (<year>).<imdb>(<rating100>).<saved>';
		
		[Bindable]
		public var renameAKAFormatDVDFolder:String = '<aka> (<title>) (<year>).<imdb>(<rating100>).<saved>';

		[Bindable]
		public var renameFormatPoster:String = 'folder';

		[Bindable]
		public var renameFormatURL:String = 'imdb';

		
		[Bindable]
		public var searchUrl:String = "http://www.imdb.com/find?s=tt&q=";
		
		[Bindable]
		public var imageProxy:String = 'http://192.168.1.103:2998/?url=';

		[Bindable]
		public var urlImdbTT:String = 'http://www.imdb.com/title/';

		[Bindable]
		public var useOriginalTitleAsAka:Boolean = true;

    [Bindable]
    public var useImdbJson:Boolean = true;

		[Bindable]
		public var movie_extensions:Array = [
			'mkv','avi','wmv','mp4','m4v','mov','ts','m2ts','ogm', 'mpg', 'mpeg', 'flv', 'iso', 'rmvb'
		];

		[Bindable]
		public var recentlyUsedFolders:Array = [];
		
		[Bindable]
		public var subtitle_extensions:Array = [
			'srt','sub','idx','rar', 'sub','subtitle'
		];
		
		[Bindable]
		public var lastFolder:String = "";

    [Bindable]
    public var nfoFolder:String = "";

    [Bindable]
    public var nfoFolderRecurse:Boolean = false;

		[Bindable]
		public var undoList:Array = [
		];
		
		[Bindable]
		public var keepTerms:Array = [
			['720p','720p'],
			['720','720p'],
			['1080p', '1080p'],
			['1080', '1080p'],
			['hdtv', 'HDTV'],
			['animated', 'Animated'],
			['cd1', 'CD1'],
			['cd2', 'CD2'],
			['dvdr','dvdr'],
			['extended', 'Extended'],
			["director's", "Director's"],
			["directors", "Director's"],
			['cut', 'Cut'],
			['dts','DTS'],
			['dc', "Director's Cut"],
			['ee', "Extended Edition"],
			['unrated', 'Unrated'],
			['uncut', 'Uncut'],
			['oar', 'HDTV'], 
			['dircut', "Director's Cut"],
			['se', 'Special Edition'],
			['blu1080p', '1080p'],
			['blu720p', '720p'],
      ['576p', '576p'],
      ['remastered', "Remastered"]
		];
		
		[Bindable]
		public var removeTerms:Array = [
      'besthd', 'lol', 'ctu', 'aaf', 'wat', 'gothic', 'river', 'xor', 'tvgeeks', 'loki', 'bamvcd', 'umd', 'ws',
      'saphire', 'medieval', 'fov', 'tcm', 'fqm', 'tvd', 'nbs', 'tns', 'med', 'schizo', 'crimson', 'mint', 'omicron',
      'incite', 'dimension', 'bia', 'internal', 'orenji', 'notv', 'sorny', 'bsgtv', 'kyr', 'readnfo', 'repack',
      'proper', 'thor', '0tv', 'angelic', 'remax', 'affinity', 'sys', 'caph', 'dot', 'etach', '2hd', 'stfu', 'yestv',
      'hiqt', 'reveille', 'rev', 'orpheus', 'sinners', 'hv', 'hdv', 'ctrlhd', 'm794', 'don', 'eisr', 'digitally',
      'limited', 'x264', 'bluray', 'bd5', 'bd9', 'hddvd', 'hd', 'dvdrip', 'cinefile', 'sammie', 'dd2', 'hdc', 'iozo',
      'bdre', 'mysilu', 'h2', 'sk', 'tk', 'kooli', 'blu', 'hdmi', 'sub', 'imdths', 'shitsony', 'crisc',  'thugline', 
      'rude', 'amiable', 'ebp', 'somedouches', 'tl', 'esir', 'dvd5', 'wild', 'progress', 'ill', 'wpi', 'sunspot',
      'adhd', 'novo', 'vc1', 'nordic', 'ac3', 'culthd', 'funner', 'dvd9', 'multi', 'soso', 'sow', 'thora', 'ltd',
      'nodlabs', 'septic', 'reptile', 'cm', 'jayc', 'bduk', 'stv', 'remux', 'h264', 'manila', 'mcr', 'ika', 'yany',
      'eureka', 'dxva', 'xpress', 'pimp', 'ray', 'vagisil', 'iwok', 'ptt', 'dbo', 'nwo', 'ppq', 'nix', 'vinyl', 'xorp',
      'dir', 'hh', 'bdrip', 'mcfly', 'hdl', 'bd', 'mmi', 'definition', 'd4', 'hdbrise', 'hdmonsk', 'c', 'z', 'hdxt',
      'qykario', 'mvmhd', 'brrip', 'ft4u', 'hdteam', 'perfectionhd', 'ssg', 'rig', 'trim', 'h264irmu', 'lukas77',
      'mojo', 'xshd', 'hddvdrip', 'donoli', 'marv', 'jy', 'subhd', 'raider10', 'klp', 'lulz', 'crossbow', 'narb',
      'h@m', 'cbgb', 'dfn', 'tse', 's', 'bigtuna', 'fsi', 'djarum', 'ipod', 'xvid', '1ch', 'gx', '2ch', 'divx', 'afld',
      'null', 'almodovar', 'divx511', 'sickboy88', 'vorbis', '=str=', 'absolonrip', 'whynot', 'shareprovider', 'com',
      'tdl', 'team', 'apex', 'wc', 'miny', 'criterion', '6ch', 'www', 'divxclasico', 'h', '264', 'kozi', 'dvd', 'rip',
      'mental', 'rg', 'gb', 'yfdrg', 'axe', 'whocares', 'ffm', 'div3', 'fmi', 'autogk', 'mp3', '128', 'abr', 'scotto',
      'divx5', 'danidin', 'ebwoy', 'fh', 'ity', 'int', 'pod', 'japhson', 'abd', 'refined', 'pigo', 'm', 'nswdonkey',
      'w23', 'flhd', 'od', 'aml', 'lchd', 'mcb', 'avc', 'f', 'melite', 'cb', 'dd20', 'halcyon', 'haideaf', 'chronohd',
      'alli', 'leverage', 'd', 'emu', 'gl', 'w0rm', 'dvb', 'crew', 'atg', 'mpa2', 'cache', 'bg', 'oem', 'sector7', 'rp',
      'smokey', 'dd1', 'wiki', 'wusiwug', 'chd', 'ab7', 'dic', 'msd', 'fine', 'riplleyhd', 'corky', 'hdb', 'divxsaati',
      'hdf', 'metis', 'c100', 'hades', 'dem', 'inflikted', 'rx', 'prodji', 'machd', 'dirty', 'dnl', 'imsorny', 'stool',
      'titans', 'mx', 'puzzle', 'blubyte', 'brmp', 'tsh', 'avs', 'hdw', 'sx264', 'pellucid', 'qcf', 'shitbusters',
      'x264crew', 'pfa', 'renderman', 'avchd', 'filmhd', 'hd4u', 'pipick', 'psv', 'viahd', 'zmg', 'bix', 'wlm', 'anihls',
      'hampie18', 'meth', 'aihd', 'apax', 'nonseptic', 'sem', 'skeptik', 'twz', 'hdcfc', '7sins', 'lhd', 'rr', 'psychd',
      'unty', 'twiz', 's7', 'birdhouse', 'nordichd', 'slater', 'sparks', 'moovee', 'seventwenty', 'hdchina', 'tayto',
      'unveil', 'shunpo', 'fcuku', 'fkkhd', 'rerip', 'kaka', 'ngr', 'lng', 'an0nym0us', 'publichd', 'hdclub', 'spero',
      'sonido', 'redblade', 'skaliwagz', 'legi0n', 'trips', 'n0nsc3n3', 'rovers', 'geckos', '7s', 'barc0de', 'fookas',
      'veto', 'hdstar', 'aac2', 'drones', 'trollhd', '0', 'cytsunee', 'blow', 'sadpanda', 'counterfeit', 'hdm4usenet',
      'untouchables', 'dev0', '1', '00d', 'dd5', 'divulged', 'spooks', 'replica', '88keyz', 'felony', 'rusted', 'semtex',
      'treble', 'kesh', 'comms', 'usury', 'rarbg', '7', 'ma', 'ghouls', 'ntb', 'bipolar', 'knorloading', 'r', 'evo',
      'hifi', 'flac', 'depth', 'obits', 'mkvcage', 'phobos', 'hdmaniacs', 'ethd', 'biq', 'noscreens', 'guacamole',
      'fapcave', 'jewelbox', 'docu', 'aac', '2', 'srg', 'amzn', 'dd+2', 'monkee', 'eider', 'handjob', 'viethd', 'qwr',
      'dd+', 'creepshow', 'x0r', 'tars', 'cadaver', 'tastetv', 'deflate', 'visum', 'flac1', 'snow', 'fgt', 'futuristic',
      'sbr', 'kat', 'fuzerhd', 'norite', 'sprinter', 'timelords', 'archivist', 'w4f', 'regret', 'rightsize', 'npw', 'ngp',
      '5', 'rcdivx', 'librarians', 'c4tv', 'cineform', 'pinkpanters', 'mandr', 'netflix', 'primalhd', 'etrg', 'intenso',
      'invandraren', 'crf', 'dj', 'chakra', 'psa', 'd00oo00m', 'excluded', 'lpd', 'alliance', 'knor', 'absinth', 'brento',
      'fiend', 'hd4fun', 'phd', 'vigi', 'gabe', 'jhd', 'ptp', 'tvsmash', 'tscc', 'usm', 'f7', 'xyz', 'pb', 'muxhd',
      'stratos', 'fizo', 'hightimes', 'ifpd', 'hca', 'daa', 'vedett', 'mbluray', 'lounge', 'gnistor', 'hijacked', 'stix',
      'cddhd', 'nohate', 'fihvid', 'gimchi', 'contribution', 'hdex', 'topcat', 'infamous', 'deprived', 'mars', 'mhd',
      'liquid', 'iguana', 'ccat', 'splitsville', 'rough', 'yify', 'qmax'
];

	
    [Bindable]
    public var mpaaConversion:Array = [
      ['NF','NR'], // this is the default 'not found' value. NR to preserve previous behavior. LEAVE AS FIRST IN ARRAY     
      ['R','R'],
      ['APPROVED','A'],
      ['NOT_RATED','NR'],
      ['PG','PG'],
      ['PG_13','PG-13'],
      ['NC_17','NC-17'],
      ['G','G'],
      ['TV_G','G'],
      ['TV_PG','TV-PG'],
      ['TV_R','TV-R'],
      ['TV_14','TV-14'],
      ['TV_Y7','TV-Y7'],
      ['TV_MA','TV-MA'],
      ['X','X'],
      ['UNRATED','NR']
    ];
   
		[Bindable]
		public var lowerTerms:Array = [
			'a',
			'the',
			'of',
			'in',
			'on',
			'and'
		];
    
    [Bindable]
    public var reTitle:String = "<title>Find - IMDb<\\/title>";
    
    [Bindable]
    public var reFindNoResults:String = "findNoResults";

    [Bindable]
    public	var reRating:String = "<div class=\"ratingValue\">\\n.*?<span>(\\d+\\.\\d+)<\\/span>";

    [Bindable]
    public	var reRatingAlternate:String = "<span class=[\"\']value[\"\'] itemprop=[\"\']ratingValue[\"\']>(\\d\.\\d*)<\\/span>";

    [Bindable]
    public	var reTitleId:String = "rel=[\"\']canonical[\"\'].+?tt(\\d\\d\\d\\d+)";
    
    [Bindable]
    public	var reTitleYear:String = "<meta property=[\"\']og:title[\"\'] content=[\"\'](.*?) \\(.*?(\\d\\d\\d\\d).*?\\).*?[\"\'].*?/>";

    [Bindable]
    public	var rePoster:String = "img_primary.*?img src=[\"\'](.*?)[\"\']";
    
		[Bindable] 
		public var reAkaSeeMore:String = ".*Also Known As (AKA)";

    [Bindable]
    public	var reAkaSingle:String = "Also Known As:<\\/h4>\s*?([^<\(]*)";
    
		[Bindable]
		public var reDirectorGroup:String = "<div class=[\"']credit_summary_item[\"'].*?Directors?:(.*?)\\/div>";
		
		[Bindable]
    public var reDirector:String = ".*?<a href=.*?>(.*?)<\\/a>";

		[Bindable]
		//public var reGenreGroup:String = "<div class=[\"\']infobar[\"\'](.*?)\\/div>";
    public var reGenreGroup:String = "<div class=[\"']title_wrapper[\"'](.*?href=\"/genre.*?)/div>";
    
		[Bindable]
    //public var reGenre:String = "<span class=[\"']itemprop[\"'] itemprop=[\"']genre[\"']>(.*?)<\\/span>";
		public var reGenre:String = "<a href=\"/genre/.*?>(.*?)</a>";
    
    [Bindable]
    //public var reStarsGroup:String = "<div class=[\"\']txt-block[\"\'].*?Stars?:(.*?)\\/div>";
    public var reStarsGroup:String = "<div class=[\"']credit_summary_item[\"'].*?Stars?:(.*?)/div>";
    
    [Bindable]
    public var reStar:String = ".*?<a href=.*?>(.*?)</a>";

    [Bindable]
    public var reMovieSearch:String = "<td class=[\"\']result_text[\"\']> <a href=[\"\']/title/tt(\\d+)\\/.*?>(.*?)</a>.*?\\((\\d+)\\).*?</td>"; 
    
		[Bindable]
		public var reOriginalTitle:String = "<div class=[\"\']originalTitle[\"\']>\\s*(.+)<span class=[\"\']description[\"\']>\\s*(original title)</span></div>";

		[Bindable]
		public var reAkaMoreGroup:String = "<a id=\"akas\" name=\"akas\"></a>.*?Also Known As \\(AKA\\).*?<table.*?<\\/table>";

		[Bindable]
		public var reAkaMore:String = "<td>(.*?)<\\/td>.*?<td>(.*?)<\\/td>";

    [Bindable]
    public var reFilenamePartsSplitter:String = "[\\[\\]\\._, \\(\\)-]";
   
    [Bindable]
    //public var reMPAARating:String = "itemprop=[\"\']contentRating[\"\'].*?content=[\"\'](.*?)[\"\']";
    public var reMPAARating:String = "<meta [^>]*?itemprop=[\"']contentRating[\"'][^>]*? content=\"(.+?)\">";
    
    [Bindable]
    //public var reDuration:String = "<time itemprop=[\"\']duration[\"\'] datetime=[\"\'].*?[\"\']>(.*?)<\/time>";
    public var reDuration:String = "<div class=\"title_wrapper\".*?datetime=\"PT(\\d+)M\"\\s*>";
    
		[Bindable]
		public var strSeeMoreAka:String = "/releaseinfo";
		
    [Bindable]
    public var testMovieId:String = '0110413';

    [Bindable]
    public var testMovieFileName:String = "Leon.DC.720p.bluray.AVCHD.mkv";

    [Bindable]
    public var includeFolderNameInSearchTerms:Boolean = false;

		public function Config() {
			
		}
      
    public function load():void
    {
    	var file:File = File.applicationStorageDirectory;
    	file = file.resolvePath('preferences.xml');
    	
    	if(!file.exists) {
    		// create the first time config if it doesn't exist
    		first(file);
    	} 
    	
			var fileStream:FileStream = new FileStream();
			fileStream.open(file, FileMode.READ);
			var str:String = fileStream.readMultiByte(file.size, File.systemCharset);
			XMLToObject(str);
			fileStream.close();	    
			
			var newValues:Config = new Config();
			// check to see if the preferences has had a version change
			if(preferencesVersion < newValues.preferencesVersion) {
				
				var bShowWarning:String = "";
				
				// back up the old preferences
				var backup:File = file.resolvePath(file.nativePath + '.v' + preferencesVersion.toString() + '.backup');
				file.copyTo(backup, true);
				
					
				// add additional conditionals for future versions
        // clean them up when they become obsolete
				if(preferencesVersion < 3) {
					this.rePoster = newValues.rePoster;
				}

				if(preferencesVersion < 4) {
					this.reDirectorGroup = newValues.reDirectorGroup;
					this.reDirector = newValues.reDirector;
					this.reGenreGroup = newValues.reGenreGroup;
					this.reGenre = newValues.reGenre;
				}

				if(preferencesVersion < 5) {
					movie_extensions.push('iso');
				}

        if(preferencesVersion < 9) {
          this.reRating = newValues.reRating;
        }

        if(preferencesVersion < 10) {
          this.reTitleYear = newValues.reTitleYear;
        }

        if(preferencesVersion < 11) {
          this.reGenreGroup = newValues.reGenreGroup;
          this.reDirector = newValues.reDirector;
          bShowWarning += " Director and Genre scrapping has been updated for changes to the IMDB site.";
        }

        if(preferencesVersion < 12) {
          this.reGenre = newValues.reGenre;
        }

        if(preferencesVersion < 13) {
          if(movie_extensions.indexOf('rmvb') == -1)
            movie_extensions.push('rmvb');
        }

        if(preferencesVersion < 14) {
          this.reMPAARating = newValues.reMPAARating;
          bShowWarning += " MPAA Rating scraping updated for changes to the IMDB site.";
        }

        if(preferencesVersion < 15) {
          this.mpaaConversion = newValues.mpaaConversion;
        }
        
        if(preferencesVersion < 16) {
          this.reTitle = newValues.reTitle;
          this.reMovieSearch = newValues.reMovieSearch;
          bShowWarning += " IMDB Search results format changed.";
        }

    		if(preferencesVersion < 17) {
    			this.reRatingAlternate = newValues.reRatingAlternate;
    			this.reTitleId = newValues.reTitleId;
    			this.reTitleYear = newValues.reTitleYear;
    			this.rePoster = newValues.rePoster;
    			this.reGenreGroup = newValues.reGenreGroup;
    			this.reStarsGroup = newValues.reStarsGroup;
    			this.reMovieSearch = newValues.reMovieSearch;
    			this.reOriginalTitle = newValues.reOriginalTitle;
    			this.reMPAARating = newValues.reMPAARating;
    			this.reDuration = newValues.reDuration;			
    			bShowWarning += " Made html tags accept ' or \" since IMDB is inconsistent.";
    		}
    
    		if(preferencesVersion < 18) {
    			this.reStar = newValues.reStar;
    			this.reDirector = newValues.reDirector;
    			this.reGenre = newValues.reGenre;
    			this.reMPAARating = newValues.reMPAARating;
    			bShowWarning += " IMDB changed Genre, Stars, MPAA, and Directors by adding an inner span tag.";
    		}

        if(preferencesVersion < 19) {
          this.reAkaMoreGroup = newValues.reAkaMoreGroup;
          this.reMovieSearch = newValues.reMovieSearch;
          bShowWarning += " IMDB changed AKA's and fixed a problem with certain movie search results with (I) or (II) in them.";
        }

        if(preferencesVersion < 20) {
          this.reMPAARating= newValues.reMPAARating;
        }

        if(preferencesVersion < 21) {
          this.reOriginalTitle = newValues.reOriginalTitle;
          this.reGenreGroup = newValues.reGenreGroup;
          this.reStarsGroup = newValues.reStarsGroup;
          this.reDirectorGroup = newValues.reDirectorGroup;
        }

        if(preferencesVersion < 22) {
          this.reGenreGroup = newValues.reGenreGroup;
          this.reGenre = newValues.reGenre;
          this.reStarsGroup = newValues.reStarsGroup;
          this.reStar = newValues.reStar;
          this.reDirectorGroup = newValues.reDirectorGroup;
          this.reDirector = newValues.reDirector;
          this.reRating = newValues.reRating;
          this.reDuration = newValues.reDuration;
          this.reMPAARating = newValues.reMPAARating;
        }

        
        
				preferencesVersion = newValues.preferencesVersion;
        
				if(bShowWarning != "")
					Alert.show("Due to an IMDB site redesign or Zeeb improvement, the settings file has changed. If you have manually customized the search terms used for scraping the information from IMDB for some reason, you may need to recreate those changes with the new design. Your old settings have been backed up to " + backup.nativePath + " and preserved where possible in the new settings file.\nChanges:\n" + bShowWarning);

				save();

			}
      
      // maybe only something that happens in dev...
      if(recentlyUsedFolders == null)
        recentlyUsedFolders = [];
    }

    public function save():void
    {
    	var file:File = File.applicationStorageDirectory;
    	file = file.resolvePath('preferences.xml');
    	
    	xml = new XML(objectToXML(this));

			var fileStream:FileStream = new FileStream();
			fileStream.open(file, FileMode.WRITE);
			fileStream.writeMultiByte(xml, File.systemCharset);
			fileStream.close();	    
    }
    
		protected function first(file:File):void {
			save();
		}

		protected function close(e:Event):void {
			save();
		}
		
		private function objectToXML(obj:Object):XML {
			var qName:QName = new QName("root");
			var xmlDocument:XMLDocument = new XMLDocument();
			var simpleXMLEncoder:SimpleXMLEncoder = new SimpleXMLEncoder(xmlDocument);
			var xmlNode:XMLNode = simpleXMLEncoder.encodeValue(obj, qName, xmlDocument);
			var xml:XML = new XML(xmlDocument.toString());
			// trace(xml.toXMLString());
			return xml;
		}
		
		// recursive function to process ArrayCollection of ObjectProxies into simple Arrays
		// generally we either have an ObjectProxy or ArrayCollection here
		private function fixArrays(obj:Object):Array {
			var arr:Array = ArrayUtil.toArray(obj);
			if(arr.length > 0 && arr[0] is ObjectProxy) {
				// fix the keepTerms and any other arrays of arrays...sigh
				for (var i:int = 0; i < arr.length; i++) {
					arr[i] = fixArrays(arr[i].item);
//					trace(arr[i]);
				}
			}
			return arr; 						
		}
		
		private function XMLToObject(xmlStr:String):void {
			var xmlDoc:XMLDocument = new XMLDocument(xmlStr);
			var decoder:SimpleXMLDecoder = new SimpleXMLDecoder(true);
			var resultObj:Object = decoder.decodeXML(xmlDoc);
			for (var key:String in resultObj.root) {
//				trace('Key: ' + key);
				if(this.hasOwnProperty(key)) {
					// overwrite our defaults with the objects from the prefs file
					if(resultObj.root[key] is ObjectProxy) {
						this[key] = fixArrays(resultObj.root[key].item);
					} else {
						this[key] = resultObj.root[key];
					}
				}
			}
		}
	}
}
