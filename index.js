const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();
const key = require('./.key.json')

// Set the faculty code to scrape here
const FACULTY = 'MKT'

// Prototype Object for a class
function Course(name, number, desc, prereq) {
	this.name = name;
	this.number = number;
	this.desc = desc;
	this.prereq = prereq;
}

(async()=>{

	// Make the request to grab the HTML
	const res = await fetch('https://aurora.umanitoba.ca/banprod/bwckctlg.p_display_courses', {
		method: 'POST',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': 'https://aurora.umanitoba.ca',
			'Content-Length': '302',
			'Accept-Language': 'en-ca',
			'Host': 'aurora.umanitoba.ca',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
			'Referer': 'https://aurora.umanitoba.ca/banprod/bwckctlg.p_disp_cat_term_date',
			'Accept-Encoding': 'gzip, deflate, br',
			'Connection': 'keep-alive',
			'Cookie': 'TESTID=set; BIGipServer~INB_SSB_Flex~Banner_Self_Service_BANPROD_pool=2584739850.12835.0000; accessibility=false'
		},
		body: `term_in=202210&call_proc_in=bwckctlg.p_disp_dyn_ctlg&sel_subj=dummy&sel_levl=dummy&sel_schd=dummy&sel_coll=dummy&sel_divs=dummy&sel_dept=dummy&sel_attr=dummy&sel_subj=${FACULTY}&sel_crse_strt=&sel_crse_end=&sel_title=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_from_cred=&sel_to_cred=&sel_attr=%25`
	})

	// Initalize various variables and arrays
	const page = await res.text();
	const $ = cheerio.load(page);
	var names = []
	var info = []
	var result = [];

	// Get table cells
	$(".datadisplaytable tr").each((index, element) => {
		if(index%2==0){
			names.push($(element).text().trim());
		} else {
			info.push($(element).text().trim());
		}
	});

	
	// Proccess the various values
	names.pop();
	descs = info.map((x) => {
		match = x.match(/^(.*)\n/);
		return match ? (match[0].charAt(0) == '-' ? "Missing Description." : match[0].trim()) : "Missing Description.";
	});

	reqs = descs.map((x, i) => {
		match = x.match(/Prerequisite.?: (.*)$/);
		return match ? match[0].trim() : "N/A";
	});

	if((descs.length != reqs.length) || (names.length != info.length) || (reqs.length != names.length)){
		console.log(descs.length, reqs.length, names.length, info.length)
		console.error("Arguments Mismatch. Error 2")
	} else {
		for(i = 0; i < descs.length; i++){
			result[i] = new Course(names[i].substring(FACULTY.length + 8), names[i].substring(0, FACULTY.length + 5), descs[i], reqs[i])
		}
	}

	// TODO: Add style to spreadsheet

	// Add to spreadsheet
	const doc = new GoogleSpreadsheet('1jBsAIa_xtPRVqXgyE9AWa48zfHyabr6KubZH5XbK4Ew');
	await doc.useServiceAccountAuth(key);
	await doc.loadInfo(); // loads document properties and worksheets
	const sheet = await doc.addSheet({ title: FACULTY, headerValues: ['number', 'name', 'prereq'] });
	await sheet.addRows(result);
	
	console.log(`Added ${names.length} rows.`)
})()
