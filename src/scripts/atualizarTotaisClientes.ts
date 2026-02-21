import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";

export const atualizarTodosTotaisClientes = async () => {
  const batch = writeBatch(db);
  let clientesAtualizados = 0;
  let clientesPulados = 0;
  
  console.log("🔄 Iniciando atualização dos totais de clientes...");
  
  // Buscar todos os clientes
  const clientesSnap = await getDocs(collection(db, "clientes"));
  console.log(`📊 Total de clientes encontrados: ${clientesSnap.docs.length}`);
  
  for (const clienteDoc of clientesSnap.docs) {
    // Buscar todas as vendas concluídas deste cliente
    const vendasQuery = query(
      collection(db, "vendas"),
      where("clienteId", "==", clienteDoc.id),
      where("status", "==", "concluida")
    );
    
    const vendasSnap = await getDocs(vendasQuery);
    
    // Calcular total de compras
    const totalCompras = vendasSnap.docs.reduce((acc, vendaDoc) => {
      const vendaData = vendaDoc.data();
      return acc + (vendaData.total || 0);
    }, 0);
    
    // Verificar se o total mudou
    const clienteData = clienteDoc.data();
    const totalAtual = clienteData.totalCompras || 0;
    
    if (Math.abs(totalAtual - totalCompras) > 0.01) { // Pequena margem para diferenças de floating point
      console.log(`   Cliente ${clienteDoc.id}: ${totalAtual} MZN → ${totalCompras} MZN (${vendasSnap.docs.length} vendas)`);
      
      // Atualizar o cliente
      batch.update(clienteDoc.ref, { totalCompras });
      clientesAtualizados++;
    } else {
      console.log(`   Cliente ${clienteDoc.id}: já está atualizado (${totalAtual} MZN)`);
      clientesPulados++;
    }
  }
  
  if (clientesAtualizados > 0) {
    await batch.commit();
    console.log(`✅ Batch commit realizado com ${clientesAtualizados} atualizações`);
  }
  
  console.log(`\n📈 Resumo da atualização:`);
  console.log(`   - Clientes atualizados: ${clientesAtualizados}`);
  console.log(`   - Clientes já corretos: ${clientesPulados}`);
  console.log(`   - Total processados: ${clientesSnap.docs.length}`);
  
  return {
    total: clientesSnap.docs.length,
    atualizados: clientesAtualizados,
    pulados: clientesPulados
  };
};

// Função para executar a atualização (pode ser chamada do console)
export const executarAtualizacao = async () => {
  try {
    const resultado = await atualizarTodosTotaisClientes();
    console.log("✅ Atualização concluída com sucesso!", resultado);
    return resultado;
  } catch (error) {
    console.error("❌ Erro durante a atualização:", error);
    throw error;
  }
};