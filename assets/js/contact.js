const form=document.getElementById('contactForm');
form?.addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('name').value.trim();
  const email=document.getElementById('email').value.trim();
  const subject=document.getElementById('subject').value.trim();
  const message=document.getElementById('message').value.trim();
  const body=`Name: ${name}\nEmail: ${email}\n\n${message}`;
  window.location.href=`mailto:henrik.bergfjord@outlook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
