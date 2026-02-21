// src/lib/store.ts
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  setDoc,
  where,
  getDoc, // Adicionado
} from "firebase/firestore";

// ===== CLIENTES =====
export interface Cliente {
  id?: string;
  nome: string;
  telefone: string;
  email: string;
  totalCompras: number;
  vendedorId?: string; // ID do vendedor que criou o cliente
  createdAt?: Timestamp;
}

export type ClienteInput = Omit<Cliente, "id" | "totalCompras" | "createdAt">;

const clientesRef = collection(db, "clientes");

export const listenClientes = (callback: (clientes: Cliente[]) => void) => {
  const q = query(clientesRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const clientes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Cliente[];
    callback(clientes);
  });
};

export const listenClientesPorVendedor = (vendedorId: string, callback: (clientes: Cliente[]) => void) => {
  const q = query(
    clientesRef, 
    where("vendedorId", "==", vendedorId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const clientes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Cliente[];
    callback(clientes);
  });
};

export const createCliente = async (data: ClienteInput, vendedorId?: string) => {
  return await addDoc(clientesRef, {
    ...data,
    vendedorId: vendedorId || null,
    totalCompras: 0,
    createdAt: Timestamp.now(),
  });
};

export const updateCliente = async (id: string, data: ClienteInput) => {
  return await updateDoc(doc(db, "clientes", id), data);
};

export const deleteCliente = async (id: string) => {
  return await deleteDoc(doc(db, "clientes", id));
};

// NOVA FUNÇÃO: Atualizar total de compras do cliente
export const atualizarTotalComprasCliente = async (clienteId: string, valorCompra: number) => {
  const clienteRef = doc(db, "clientes", clienteId);
  const clienteSnap = await getDoc(clienteRef);
  
  if (clienteSnap.exists()) {
    const clienteData = clienteSnap.data() as Cliente;
    const totalAtual = clienteData.totalCompras || 0;
    
    await updateDoc(clienteRef, {
      totalCompras: totalAtual + valorCompra
    });
  }
};

// ===== CATEGORIAS =====
export interface Categoria {
  id?: string;
  nome: string;
  createdAt?: Timestamp;
}

export type CategoriaInput = {
  nome: string;
};

const categoriasRef = collection(db, "categorias");

export const createCategoria = async (data: CategoriaInput) => {
  return await addDoc(categoriasRef, {
    ...data,
    createdAt: Timestamp.now(),
  });
};

export const updateCategoria = async (id: string, data: CategoriaInput) => {
  return await updateDoc(doc(db, "categorias", id), data);
};

export const deleteCategoria = async (id: string) => {
  return await deleteDoc(doc(db, "categorias", id));
};

export const listenCategorias = (callback: (categorias: Categoria[]) => void) => {
  const q = query(categoriasRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const categorias = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Categoria[];
    callback(categorias);
  });
};

// ===== PRODUTOS =====
export interface Produto {
  id?: string;
  nome: string;
  categoria: string;
  precoCompra: number;
  precoVenda: number;
  stock: number;
  createdAt?: Timestamp;
}

export type ProdutoInput = Omit<Produto, "id" | "createdAt">;

const produtosRef = collection(db, "produtos");

export const createProduto = async (data: ProdutoInput) => {
  return await addDoc(produtosRef, {
    ...data,
    createdAt: Timestamp.now(),
  });
};

export const updateProduto = async (id: string, data: ProdutoInput) => {
  return await updateDoc(doc(db, "produtos", id), data);
};

export const deleteProduto = async (id: string) => {
  return await deleteDoc(doc(db, "produtos", id));
};

export const listenProdutos = (callback: (produtos: Produto[]) => void) => {
  const q = query(produtosRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, snapshot => {
    const produtos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Produto[];
    callback(produtos);
  });
};

// ===== VENDAS =====
export interface VendaProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Venda {
  id?: string;
  clienteId: string | null;
  clienteNome: string;
  produtos: VendaProduto[];
  subtotal: number;
  iva: number;
  desconto: number;
  total: number;
  metodoPagamento: "dinheiro" | "cartao" | "transferencia";
  status: "pendente" | "concluida" | "cancelada";
  valorRecebido?: number;
  troco?: number;
  vendedorId?: string; // ID do vendedor que realizou a venda
  motivoCancelamento?: string; // Para registrar motivo de cancelamento
  createdAt?: Timestamp;
}

export type VendaInput = Omit<Venda, "id" | "createdAt">;

const vendasRef = collection(db, "vendas");

// FUNÇÃO MODIFICADA: createVenda agora atualiza o total do cliente
export const createVenda = async (data: VendaInput) => {
  // Primeiro, criar a venda
  const vendaRef = await addDoc(vendasRef, {
    ...data,
    createdAt: Timestamp.now(),
  });

  // Se a venda tem um cliente associado e está concluída, atualizar o total de compras
  if (data.clienteId && data.status === "concluida") {
    await atualizarTotalComprasCliente(data.clienteId, data.total);
  }

  return vendaRef;
};

export const listenVendas = (callback: (vendas: Venda[]) => void) => {
  const q = query(vendasRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const vendas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Venda[];
    callback(vendas);
  });
};

export const listenVendasPorVendedor = (vendedorId: string, callback: (vendas: Venda[]) => void) => {
  const q = query(
    vendasRef, 
    where("vendedorId", "==", vendedorId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const vendas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Venda[];
    callback(vendas);
  });
};

export const updateVendaStatus = async (id: string, status: Venda["status"], motivo?: string) => {
  const updateData: any = { status };
  if (motivo) {
    updateData.motivoCancelamento = motivo;
  }
  return await updateDoc(doc(db, "vendas", id), updateData);
};

// ===== USUÁRIOS =====
export interface Usuario {
  id?: string;
  authUid: string;
  nome: string;
  email: string;
  tipo: "admin" | "vendedor";
  telefone?: string;
  dataRegistro: Timestamp;
  ultimoAcesso?: Timestamp;
  ativo: boolean;
  limiteDesconto?: number; // Limite de desconto para vendedor (%)
}

export type UsuarioInput = Omit<Usuario, "id" | "dataRegistro" | "ultimoAcesso">;

const usuariosRef = collection(db, "usuarios");

export const createUsuario = async (data: UsuarioInput) => {
  return await addDoc(usuariosRef, {
    ...data,
    dataRegistro: Timestamp.now(),
    ultimoAcesso: null,
  });
};

export const updateUsuario = async (id: string, data: Partial<UsuarioInput>) => {
  return await updateDoc(doc(db, "usuarios", id), data);
};

export const deleteUsuario = async (id: string) => {
  return await deleteDoc(doc(db, "usuarios", id));
};

export const listenUsuarios = (callback: (usuarios: Usuario[]) => void) => {
  const q = query(usuariosRef, orderBy("dataRegistro", "desc"));
  return onSnapshot(q, (snapshot) => {
    const usuarios = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Usuario[];
    callback(usuarios);
  });
};

export const updateUltimoAcesso = async (id: string) => {
  return await updateDoc(doc(db, "usuarios", id), {
    ultimoAcesso: Timestamp.now(),
  });
};