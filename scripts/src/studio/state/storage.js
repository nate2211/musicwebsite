const INDEX_KEY="musicstudiolab.enterprise.projects.v3";
export function loadProjects(){try{return JSON.parse(localStorage.getItem(INDEX_KEY)||"[]");}catch(_){return [];}}
export function saveProject(project){const projects=loadProjects(),next=[project,...projects.filter(p=>p.id!==project.id)].slice(0,25);localStorage.setItem(INDEX_KEY,JSON.stringify(next));return next;}
export function deleteSavedProject(id){const next=loadProjects().filter(p=>p.id!==id);localStorage.setItem(INDEX_KEY,JSON.stringify(next));return next;}
export function exportProject(project){const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${project.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.musicstudio.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function importProjectFile(file){const text=await file.text(),parsed=JSON.parse(text);if(!parsed?.tracks||!Array.isArray(parsed.tracks))throw new Error("This is not a valid MusicStudioLab project.");return parsed;}
