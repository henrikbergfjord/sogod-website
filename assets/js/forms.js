function enc(s){return encodeURIComponent(s||'');}

function validForm(form){
  if(!form.checkValidity()){
    form.reportValidity();
    return false;
  }
  return true;
}

function selectedServices(form){
  return [...form.querySelectorAll('.service-check:checked')].map(input=>{
    const row=input.closest('.choice-row');
    const title=row?.querySelector('.choice-copy strong')?.textContent?.trim() || input.dataset.service || 'Service';
    const qty=row?.querySelector('.service-qty');
    return qty ? `${title} (${qty.value})` : title;
  });
}

const booking=document.getElementById('bookingForm');
if(booking){
  booking.addEventListener('submit',e=>{
    e.preventDefault();
    if(!validForm(booking)) return;
    const f=new FormData(booking);
    const services=selectedServices(booking).join(', ')||'None selected';
    const interests=f.getAll('interest').join(', ')||'None selected';
    const body=`Name: ${f.get('name')||''}\nEmail: ${f.get('email')||''}\nCountry: ${f.get('country')||''}\nPhone/WhatsApp: ${f.get('phone')||''}\nArrival: ${f.get('arrival')||''}\nDeparture: ${f.get('departure')||''}\nGuests: ${f.get('guests')||''}\n\nHelp requested: ${services}\nInterests: ${interests}\n\nAbout us / trip:\n${f.get('message')||''}\n\nAnything else:\n${f.get('anythingElse')||''}`;
    location.href=`mailto:henrik.bergfjord@outlook.com?subject=${enc('Sogod Stay booking request')}&body=${enc(body)}`;
  });
}

const contact=document.getElementById('contactForm');
if(contact){
  contact.addEventListener('submit',e=>{
    e.preventDefault();
    if(!validForm(contact)) return;
    const f=new FormData(contact);
    const body=`Name: ${f.get('name')||''}\nEmail: ${f.get('email')||''}\n\n${f.get('message')||''}`;
    location.href=`mailto:henrik.bergfjord@outlook.com?subject=${enc(f.get('subject')||'Sogod Stay enquiry')}&body=${enc(body)}`;
  });
}
