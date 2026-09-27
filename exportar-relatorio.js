async function exportarRelatorioPDF(btn){
  const original=btn.textContent;
  btn.disabled=true; btn.textContent='GERANDO PDF...';
  try{
    async function carregar(src,teste){
      if(teste()) return;
      await new Promise((ok,erro)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=erro;document.head.appendChild(s)});
    }
    await carregar('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',()=>!!window.html2canvas);
    await carregar('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',()=>!!window.jspdf);
    const actions=document.querySelector('.actions'); if(actions) actions.style.display='none';
    const canvas=await html2canvas(document.body,{scale:1.5,useCORS:true,backgroundColor:'#ffffff'});
    if(actions) actions.style.display='';
    const PDF=window.jspdf.jsPDF,pdf=new PDF('p','mm','a4'),pw=210,ph=297,ih=canvas.height*pw/canvas.width,img=canvas.toDataURL('image/jpeg',0.92);
    let y=0; pdf.addImage(img,'JPEG',0,y,pw,ih);
    for(let left=ih-ph;left>0;left-=ph){y=left-ih;pdf.addPage();pdf.addImage(img,'JPEG',0,y,pw,ih)}
    const blob=pdf.output('blob'),file=new File([blob],'relatorio-produtos-estoque.pdf',{type:'application/pdf'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})) await navigator.share({files:[file],title:'Relatório de Produtos e Estoque'});
    else {const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
  }catch(e){alert('Não foi possível exportar o PDF.');}
  finally{const actions=document.querySelector('.actions');if(actions)actions.style.display='';btn.disabled=false;btn.textContent=original;}
}