async function exportarRelatorioPDF(btn){
  const original=btn.textContent;
  btn.disabled=true; btn.textContent='GERANDO PDF...';
  try{
    const doc=document, actions=doc.querySelector('.actions');
    if(actions) actions.style.display='none';
    const tabelas=[...doc.querySelectorAll('table')];
    const secoes=[...doc.querySelectorAll('h2')];
    const PDFURL='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
    if(!window.jspdf){
      await new Promise((ok,erro)=>{const s=doc.createElement('script');s.src=PDFURL;s.onload=ok;s.onerror=erro;doc.head.appendChild(s)});
    }
    if(!window.jspdf) throw new Error('jsPDF');
    const {jsPDF}=window.jspdf, pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    let y=16;
    pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.text('RELATORIO DE PRODUTOS E ESTOQUE',105,y,{align:'center'});y+=12;
    const limpar=s=>String(s||'').replace(/\s+/g,' ').trim();
    for(let ti=0;ti<tabelas.length;ti++){
      if(secoes[ti]){if(y>270){pdf.addPage();y=16}pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text(limpar(secoes[ti].textContent),12,y);y+=7}
      const rows=[...tabelas[ti].rows];
      for(const row of rows){
        const vals=[...row.cells].map(c=>limpar(c.textContent));
        const line=vals.join('   |   ');
        const lines=pdf.splitTextToSize(line,186);
        if(y+lines.length*5>285){pdf.addPage();y=16}
        pdf.setFont('helvetica',row.querySelector('th')?'bold':'normal');pdf.setFontSize(8.5);pdf.text(lines,12,y);y+=lines.length*5+2;
      }
      y+=5;
    }
    const blob=pdf.output('blob'), nome='relatorio-produtos-estoque.pdf';
    const file=new File([blob],nome,{type:'application/pdf'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:'Relatório de Produtos e Estoque'});
    }else{
      const url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=nome;doc.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    }
  }catch(e){alert('Não foi possível exportar o PDF.');console.error(e)}
  finally{const actions=document.querySelector('.actions');if(actions)actions.style.display='';btn.disabled=false;btn.textContent=original}
}