(() => {
  'use strict';

  const CLARITY = (eventName, data = {}) => {
    try {
      if (typeof window.clarity === 'function') {
        window.clarity('event', eventName, data);
      }
    } catch (_) {}
  };

  const EU_COUNTRIES = [
    ['AT','Austria','🇦🇹'],['BE','Belgium','🇧🇪'],['BG','Bulgaria','🇧🇬'],['HR','Croatia','🇭🇷'],
    ['CY','Cyprus','🇨🇾'],['CZ','Czechia','🇨🇿'],['DK','Denmark','🇩🇰'],['EE','Estonia','🇪🇪'],
    ['FI','Finland','🇫🇮'],['FR','France','🇫🇷'],['DE','Germany','🇩🇪'],['GR','Greece','🇬🇷'],
    ['HU','Hungary','🇭🇺'],['IE','Ireland','🇮🇪'],['IT','Italy','🇮🇹'],['LV','Latvia','🇱🇻'],
    ['LT','Lithuania','🇱🇹'],['LU','Luxembourg','🇱🇺'],['MT','Malta','🇲🇹'],['NL','Netherlands','🇳🇱'],
    ['PL','Poland','🇵🇱'],['PT','Portugal','🇵🇹'],['RO','Romania','🇷🇴'],['SK','Slovakia','🇸🇰'],
    ['SI','Slovenia','🇸🇮'],['ES','Spain','🇪🇸'],['SE','Sweden','🇸🇪']
  ];

  // Norway is not an EU member, but is deliberately included as a featured option for this planner.
  const COUNTRIES = [['NO','Norway','🇳🇴'], ['PH','Philippines','🇵🇭'], ...EU_COUNTRIES];

  const state = {
    date: new Date(),
    countryCode: localStorage.getItem('plannerCountry') || 'NO',
    countryName: 'Norway',
    holidays: [],
    destination: { name: 'Albay, Philippines', latitude: 13.1775, longitude: 123.5280, country: 'Philippines' },
    weather: null,
    bestLeave: []
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const $ = (id) => document.getElementById(id);

  const els = {
    countryButtons: $('countryButtons'), selectedCountryLabel: $('selectedCountryLabel'),
    prevMonth: $('prevMonth'), nextMonth: $('nextMonth'), monthTitle: $('monthTitle'),
    monthSelect: $('monthSelect'), yearSelect: $('yearSelect'), todayBtn: $('todayBtn'),
    holidayCount: $('holidayCount'), calendarGrid: $('calendarGrid'),
    smartLeaveResults: $('smartLeaveResults'), heroSmartResult: $('heroSmartResult'),
    copyCalendar: $('copyCalendar'), printCalendar: $('printCalendar'),
    destinationInput: $('destinationInput'), destinationSearchBtn: $('destinationSearchBtn'),
    destinationStatus: $('destinationStatus'), destinationName: $('destinationName'), currentTemp: $('currentTemp'),
    weatherSummary: $('weatherSummary'), forecastStrip: $('forecastStrip'), destinationMap: $('destinationMap'), mapTitle: $('mapTitle'),
    seasonAdvice: $('seasonAdvice'), flightHeading: $('flightHeading'), flightAdvice: $('flightAdvice'), googleFlightsLink: $('googleFlightsLink'),
    summaryContent: $('summaryContent'), copyPlan: $('copyPlan'), printPlan: $('printPlan')
  };

  function countryTuple(code) { return COUNTRIES.find(c => c[0] === code) || COUNTRIES[0]; }
  function pad(n) { return String(n).padStart(2,'0'); }
  function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function formatDate(d) { return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }); }

  function isoWeekNumber(date) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
    return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  }

  function mondayOnOrBefore(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0,0,0,0);
    return d;
  }

  function renderCountryButtons() {
    els.countryButtons.innerHTML = '';
    COUNTRIES.forEach(([code,name,flag], index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `country-btn ${code === state.countryCode ? 'active' : ''} ${index < 2 ? 'featured' : ''}`;
      btn.textContent = `${flag} ${name}`;
      btn.addEventListener('click', () => selectCountry(code));
      els.countryButtons.appendChild(btn);
    });
  }

  async function selectCountry(code) {
    const [cc,name] = countryTuple(code);
    state.countryCode = cc;
    state.countryName = name;
    localStorage.setItem('plannerCountry', cc);
    els.selectedCountryLabel.textContent = name;
    renderCountryButtons();
    updateFlightAdvice();
    CLARITY('planner_country_selected', { country: cc });
    await loadHolidays();
  }

  function buildSelectors() {
    monthNames.forEach((m,i) => {
      const o = document.createElement('option'); o.value=i; o.textContent=m; els.monthSelect.appendChild(o);
    });
    const currentYear = new Date().getFullYear();
    for (let y=currentYear-3; y<=currentYear+7; y++) {
      const o = document.createElement('option'); o.value=y; o.textContent=y; els.yearSelect.appendChild(o);
    }
  }

  async function loadHolidays() {
    const year = state.date.getFullYear();
    els.holidayCount.textContent = 'Loading public holidays…';
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${state.countryCode}`);
      if (!res.ok) throw new Error(`Holiday service returned ${res.status}`);
      state.holidays = await res.json();
      renderAll();
      CLARITY('planner_holidays_loaded', { country: state.countryCode, year: String(year) });
    } catch (err) {
      state.holidays = [];
      renderAll();
      els.holidayCount.textContent = 'Public holiday data unavailable';
      console.error(err);
    }
  }

  function renderAll() {
    renderCalendar();
    calculateSmartLeave();
    renderSmartLeave();
    renderSummary();
  }

  function renderCalendar() {
    const year = state.date.getFullYear();
    const month = state.date.getMonth();
    els.monthTitle.textContent = `${monthNames[month]} ${year}`;
    els.monthSelect.value = String(month);
    els.yearSelect.value = String(year);

    const monthlyHolidays = state.holidays.filter(h => new Date(`${h.date}T12:00:00`).getMonth() === month);
    els.holidayCount.textContent = monthlyHolidays.length ? `${monthlyHolidays.length} public holiday${monthlyHolidays.length===1?'':'s'} this month` : 'No national public holidays this month';

    const first = new Date(year, month, 1);
    const start = mondayOnOrBefore(first);
    const todayKey = ymd(new Date());
    const holidayMap = new Map(state.holidays.map(h => [h.date, h]));
    let html = '';

    for (let week=0; week<6; week++) {
      const weekStart = new Date(start); weekStart.setDate(start.getDate() + week*7);
      html += `<div class="week-cell" title="ISO week ${isoWeekNumber(weekStart)}">${isoWeekNumber(weekStart)}</div>`;
      for (let day=0; day<7; day++) {
        const d = new Date(weekStart); d.setDate(weekStart.getDate()+day);
        const key = ymd(d);
        const holiday = holidayMap.get(key);
        const classes = ['calendar-cell'];
        if (d.getMonth() !== month) classes.push('outside');
        if (day >= 5) classes.push('weekend');
        if (key === todayKey) classes.push('today');
        html += `<div class="${classes.join(' ')}" data-date="${key}">
          <span class="day-number">${d.getDate()}</span>
          ${holiday ? `<span class="holiday-pill" title="${escapeHtml(holiday.localName || holiday.name)}">${escapeHtml(holiday.localName || holiday.name)}</span>` : ''}
        </div>`;
      }
    }
    els.calendarGrid.innerHTML = html;
  }

  function calculateSmartLeave() {
    const year = state.date.getFullYear();
    const holidayMap = new Map(state.holidays.map(h => [h.date, h]));
    const results = [];
    let d = mondayOnOrBefore(new Date(year,0,1));
    const end = new Date(year,11,31);

    while (d <= end) {
      let weekdayHolidays = [];
      for (let i=0;i<5;i++) {
        const day = new Date(d); day.setDate(d.getDate()+i);
        const h = holidayMap.get(ymd(day));
        if (h) weekdayHolidays.push({date:new Date(day), holiday:h});
      }
      if (weekdayHolidays.length) {
        const leaveDays = 5 - weekdayHolidays.length;
        const satBefore = new Date(d); satBefore.setDate(d.getDate()-2);
        const sunAfter = new Date(d); sunAfter.setDate(d.getDate()+6);
        results.push({ week: isoWeekNumber(d), weekStart:new Date(d), leaveDays, weekdayHolidays, start:satBefore, end:sunAfter });
      }
      d.setDate(d.getDate()+7);
    }
    state.bestLeave = results.sort((a,b) => a.leaveDays-b.leaveDays || a.weekStart-b.weekStart);
  }

  function renderSmartLeave() {
    const relevant = state.bestLeave.slice(0,5);
    if (!relevant.length) {
      els.smartLeaveResults.innerHTML = `<div class="smart-empty">No weekday public-holiday opportunities found for ${state.countryName} in ${state.date.getFullYear()}.</div>`;
      els.heroSmartResult.textContent = `No weekday public-holiday shortcuts found for ${state.date.getFullYear()}.`;
      return;
    }
    els.smartLeaveResults.innerHTML = relevant.map((r,i) => {
      const holidayNames = r.weekdayHolidays.map(h => h.holiday.localName || h.holiday.name).join(' + ');
      return `<div class="smart-result ${i===0?'best':''}">
        <div class="smart-days">9 days away · ${r.leaveDays} leave day${r.leaveDays===1?'':'s'}</div>
        <div class="smart-meta">Week ${r.week} · ${formatDate(r.start)}–${formatDate(r.end)}<br>${escapeHtml(holidayNames)}</div>
      </div>`;
    }).join('');
    const best = relevant[0];
    els.heroSmartResult.textContent = `In ${state.countryName}, week ${best.week} can give you 9 days off using ${best.leaveDays} vacation day${best.leaveDays===1?'':'s'}.`;
  }

  function monthCopyText() {
    const year = state.date.getFullYear(), month = state.date.getMonth();
    const lines = [`${monthNames[month]} ${year} — ${state.countryName}`, 'Week\tDate\tDay\tPublic holiday'];
    const days = new Date(year, month+1, 0).getDate();
    const hMap = new Map(state.holidays.map(h => [h.date, h]));
    for (let i=1;i<=days;i++) {
      const d = new Date(year,month,i), h=hMap.get(ymd(d));
      lines.push(`${isoWeekNumber(d)}\t${ymd(d)}\t${d.toLocaleDateString('en-GB',{weekday:'long'})}\t${h ? (h.localName || h.name) : ''}`);
    }
    return lines.join('\n');
  }

  function planText() {
    const best = state.bestLeave[0];
    const dest = state.destination?.name || 'No destination selected';
    const current = state.weather?.current?.temperature_2m;
    const lines = [
      'SOGOD STAY — HOLIDAY & TRAVEL PLAN',
      `Home country: ${state.countryName}`,
      `Calendar: ${monthNames[state.date.getMonth()]} ${state.date.getFullYear()}`,
      `Destination: ${dest}`,
      current != null ? `Current destination temperature: ${Math.round(current)}°C` : '',
      best ? `Best leave opportunity: Week ${best.week} — 9 days away using ${best.leaveDays} leave day(s), ${formatDate(best.start)}–${formatDate(best.end)}` : '',
      '',
      monthCopyText()
    ];
    return lines.filter(v => v !== '').join('\n');
  }

  async function copyText(text, label) {
    try { await navigator.clipboard.writeText(text); showToast(label); }
    catch (_) { showToast('Copy failed — select and copy manually'); }
  }

  function showToast(message) {
    let t = document.querySelector('.toast');
    if (!t) { t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent=message; t.classList.add('show');
    clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2200);
  }

  function escapeHtml(str='') { return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  async function searchDestination() {
    const q = els.destinationInput.value.trim();
    if (!q) return;
    els.destinationStatus.textContent = 'Finding destination…';
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
      const data = await r.json();
      if (!data.results?.length) throw new Error('No destination found');
      const loc = data.results[0];
      state.destination = {
        name: [loc.name, loc.admin1, loc.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', '),
        latitude: loc.latitude, longitude: loc.longitude, country: loc.country || '', countryCode: loc.country_code || ''
      };
      els.destinationStatus.textContent = `Using ${state.destination.name}`;
      CLARITY('planner_destination_selected', { destination: state.destination.name });
      updateMap();
      updateSeasonAdvice();
      await loadWeather();
      renderSummary();
    } catch (err) {
      els.destinationStatus.textContent = 'Could not find that destination. Try a city or region name.';
      console.error(err);
    }
  }

  async function loadWeather() {
    const {latitude,longitude} = state.destination;
    els.weatherSummary.textContent = 'Loading current weather and forecast…';
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
      state.weather = await res.json();
      renderWeather();
      CLARITY('planner_weather_loaded', { destination: state.destination.name });
    } catch (err) {
      state.weather = null;
      els.weatherSummary.textContent = 'Weather data is temporarily unavailable.';
      console.error(err);
    }
  }

  function weatherLabel(code) {
    if (code === 0) return 'Clear';
    if ([1,2].includes(code)) return 'Mostly clear';
    if (code === 3) return 'Cloudy';
    if ([45,48].includes(code)) return 'Fog';
    if ([51,53,55,56,57].includes(code)) return 'Drizzle';
    if ([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
    if ([71,73,75,77,85,86].includes(code)) return 'Snow';
    if ([95,96,99].includes(code)) return 'Thunderstorms';
    return 'Mixed conditions';
  }

  function renderWeather() {
    const w = state.weather;
    els.destinationName.textContent = state.destination.name;
    els.currentTemp.textContent = `${Math.round(w.current.temperature_2m)}°`;
    els.weatherSummary.textContent = `${weatherLabel(w.current.weather_code)} · feels like ${Math.round(w.current.apparent_temperature)}°C · wind ${Math.round(w.current.wind_speed_10m)} km/h.`;
    els.forecastStrip.innerHTML = w.daily.time.slice(0,5).map((date,i) => {
      const d = new Date(`${date}T12:00:00`);
      return `<div class="forecast-day"><strong>${d.toLocaleDateString('en-GB',{weekday:'short'})}</strong><span>${Math.round(w.daily.temperature_2m_max[i])}° / ${Math.round(w.daily.temperature_2m_min[i])}°</span><span>${weatherLabel(w.daily.weather_code[i])}</span><span>${w.daily.precipitation_probability_max[i] ?? 0}% rain</span></div>`;
    }).join('');
  }

  function updateMap() {
    const {latitude:lat, longitude:lon, name} = state.destination;
    const span = 0.18;
    const bbox = `${lon-span}%2C${lat-span}%2C${lon+span}%2C${lat+span}`;
    els.destinationMap.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
    els.mapTitle.textContent = name;
  }

  function updateSeasonAdvice() {
    const dest = (state.destination?.country || '').toLowerCase();
    let advice;
    if (dest.includes('philippines')) {
      advice = [
        ['☀️','Best weather','December to February is often cooler and drier in many parts of the Philippines.'],
        ['🌡️','Hotter months','March to May is commonly hotter, with strong sun and higher daytime temperatures.'],
        ['🌧️','Wetter period','June to October is generally wetter; tropical storms can affect travel depending on region.'],
        ['💸','Often better value','Outside Christmas/New Year, Holy Week and major school-holiday peaks can be easier on the budget.']
      ];
    } else {
      const lat = Math.abs(state.destination?.latitude || 0);
      if (lat > 40) advice = [
        ['🌱','Shoulder season','Late spring and early autumn often balance milder weather with fewer peak-season crowds.'],
        ['☀️','Peak summer','Summer usually offers longer days but often comes with higher accommodation and flight demand.'],
        ['❄️','Winter travel','Winter can be cheaper outside Christmas/New Year, depending on ski and event demand.'],
        ['💸','Price strategy','Compare dates one to three days either side of your ideal departure before booking.']
      ];
      else advice = [
        ['🌤️','Shoulder season','Periods just before or after the busiest season often offer a good weather-price balance.'],
        ['🔥','Peak periods','Major school holidays and local festivals can raise demand and prices.'],
        ['🌧️','Weather trade-off','Lower prices can coincide with wetter or hotter periods; check local seasonal patterns.'],
        ['💸','Price strategy','Use flexible dates and compare nearby airports when practical.']
      ];
    }
    els.seasonAdvice.innerHTML = advice.map(([icon,title,text]) => `<div class="advice-item"><div class="advice-icon">${icon}</div><div><strong>${title}</strong><span>${text}</span></div></div>`).join('');
  }

  function updateFlightAdvice() {
    const home = state.countryName;
    els.flightHeading.textContent = `Flying from ${home}`;
    const base = [
      ['📅','Compare flexible dates','Search one to three days before and after your ideal dates; midweek departures can sometimes price differently.'],
      ['🧳','Compare the real total','Check baggage, seat fees and connection costs — not just the headline fare.'],
      ['🔁','Check more than one routing','Compare a through-ticket with sensible alternative hubs or nearby departure airports.'],
      ['⏱️','Do not chase one “magic” booking day','Airfares are dynamic. Set a target budget and compare consistently rather than relying on myths.']
    ];
    if (state.countryCode === 'NO') base.unshift(['✈️','For long-haul Asia','Compare Oslo departures with Copenhagen, Stockholm and major European hubs when the connection remains practical.']);
    els.flightAdvice.innerHTML = base.map(([icon,title,text]) => `<div class="advice-item"><div class="advice-icon">${icon}</div><div><strong>${title}</strong><span>${text}</span></div></div>`).join('');
  }

  function renderSummary() {
    const best = state.bestLeave[0];
    const current = state.weather?.current?.temperature_2m;
    const monthlyHolidays = state.holidays.filter(h => new Date(`${h.date}T12:00:00`).getMonth() === state.date.getMonth()).length;
    els.summaryContent.innerHTML = `
      <div class="summary-stat"><small>Home country</small><strong>${escapeHtml(state.countryName)}</strong></div>
      <div class="summary-stat"><small>Calendar</small><strong>${monthNames[state.date.getMonth()]} ${state.date.getFullYear()}</strong></div>
      <div class="summary-stat"><small>Public holidays this month</small><strong>${monthlyHolidays}</strong></div>
      <div class="summary-stat"><small>Best leave opportunity</small><strong>${best ? `9 days / ${best.leaveDays} leave days` : '—'}</strong></div>
      <div class="summary-stat"><small>Destination</small><strong>${escapeHtml(state.destination?.name || '—')}</strong></div>
      <div class="summary-stat"><small>Current temperature</small><strong>${current != null ? `${Math.round(current)}°C` : '—'}</strong></div>`;
  }

  function changeMonth(delta) {
    state.date = new Date(state.date.getFullYear(), state.date.getMonth()+delta, 1);
    if (!Array.from(els.yearSelect.options).some(o => Number(o.value) === state.date.getFullYear())) return;
    if (state.holidays.length && new Date(`${state.holidays[0].date}T12:00:00`).getFullYear() === state.date.getFullYear()) renderAll();
    else loadHolidays();
    CLARITY('planner_month_changed', { month: String(state.date.getMonth()+1), year: String(state.date.getFullYear()) });
  }

  els.prevMonth.addEventListener('click',()=>changeMonth(-1));
  els.nextMonth.addEventListener('click',()=>changeMonth(1));
  els.monthTitle.addEventListener('click',()=>{ state.date=new Date(); loadHolidays(); });
  els.todayBtn.addEventListener('click',()=>{ state.date=new Date(); loadHolidays(); });
  els.monthSelect.addEventListener('change',()=>{ state.date=new Date(state.date.getFullYear(),Number(els.monthSelect.value),1); renderAll(); });
  els.yearSelect.addEventListener('change',()=>{ state.date=new Date(Number(els.yearSelect.value),state.date.getMonth(),1); loadHolidays(); });
  els.copyCalendar.addEventListener('click',()=>{ copyText(monthCopyText(),'Calendar copied'); CLARITY('planner_copy_calendar', {country:state.countryCode}); });
  els.printCalendar.addEventListener('click',()=>{ CLARITY('planner_pdf_export', {scope:'calendar'}); window.print(); });
  els.destinationSearchBtn.addEventListener('click',searchDestination);
  els.destinationInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') searchDestination(); });
  els.copyPlan.addEventListener('click',()=>{ copyText(planText(),'Travel plan copied'); CLARITY('planner_copy_plan', {country:state.countryCode}); });
  els.printPlan.addEventListener('click',()=>{ CLARITY('planner_pdf_export', {scope:'full_plan'}); window.print(); });
  els.googleFlightsLink.addEventListener('click',()=>CLARITY('planner_flight_search_clicked',{home:state.countryCode,destination:state.destination?.name || ''}));

  async function init() {
    buildSelectors();
    const [cc,name] = countryTuple(state.countryCode); state.countryCode=cc; state.countryName=name;
    els.selectedCountryLabel.textContent=name;
    renderCountryButtons();
    updateFlightAdvice();
    updateMap();
    updateSeasonAdvice();
    await loadHolidays();
    await loadWeather();
    renderSummary();
    CLARITY('planner_loaded');
  }

  init();
})();
