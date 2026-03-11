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
  increment,
  runTransaction,
  serverTimestamp,
  getDoc,
  type Unsubscribe,
  type FirestoreError,
} from "firebase/firestore";

// ===== HELPERS =====
type SnapshotErrorHandler = (error: FirestoreError) => void;
type FirestoreDate = Timestamp | null | undefined;

const defaultSnapshotError = (label: string, error: FirestoreError) => {
  if (import.meta.env.DEV) {
    console.error(`Erro no listener ${label}:`, error);
  }
};

const normalizeString = (value?: string | null) => value?.trim() ?? "";
const normalizeLower = (value?: string | null) =>
  normalizeString(value).toLowerCase();

const nowTimestamp = () => Timestamp.now();

const withTimestampsOnCreate = <T extends object>(data: T) => ({
  ...data,
  createdAt: nowTimestamp(),
  updatedAt: nowTimestamp(),
});

const withTimestampOnUpdate = <T extends object>(data: T) => ({
  ...data,
  updatedAt: nowTimestamp(),
});

const removeUndefinedFields = <T extends Record<string, any>>(obj: T) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
};

const isTrialExpired = (
  trialFim?: Timestamp | string | null,
  statusPlano?: string | null
) => {
  if (statusPlano === "expirado") return true;
  if (!trialFim) return false;

  const date =
    typeof trialFim === "string"
      ? new Date(trialFim)
      : trialFim instanceof Timestamp
        ? trialFim.toDate()
        : null;

  if (!date || Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
};

const userPlanBlocked = (userData: any) => {
  if (!userData) return false;
  if (userData.statusPlano === "bloqueado") return true;
  if (userData.plano === "trial" && isTrialExpired(userData.trialFim, userData.statusPlano)) {
    return true;
  }
  return false;
};

const ensureUserPlanAllowsWrite = async (uid?: string | null) => {
  if (!uid) {
    throw new Error("Utilizador autenticado não encontrado.");
  }

  const userRef = doc(db, "usuarios", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Utilizador não encontrado no Firestore.");
  }

  const userData = userSnap.data();

  if (!userData?.ativo) {
    throw new Error("Utilizador inativo.");
  }

  if (userPlanBlocked(userData)) {
    throw new Error("O plano do utilizador expirou ou está bloqueado.");
  }
};

// ===== CLIENTES =====
export type ClienteStatus = "ativo" | "inativo";
export type ClienteOrigem =
  | "balcao"
  | "referencia"
  | "online"
  | "whatsapp"
  | "outro";

export interface Cliente {
  id?: string;
  nome: string;
  telefone: string;
  email?: string;
  nuit?: string;
  endereco?: string;
  observacoes?: string;
  limiteCredito?: number;
  status?: ClienteStatus;
  origem?: ClienteOrigem;
  ultimoAtendimento?: string;
  totalCompras: number;
  vendedorId?: string | null;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type ClienteInput = Omit<
  Cliente,
  "id" | "totalCompras" | "createdAt" | "updatedAt"
>;

const clientesRef = collection(db, "clientes");

const normalizeClienteInput = (data: ClienteInput): ClienteInput => ({
  nome: normalizeString(data.nome),
  telefone: normalizeString(data.telefone),
  email: normalizeString(data.email),
  nuit: normalizeString(data.nuit),
  endereco: normalizeString(data.endereco),
  observacoes: normalizeString(data.observacoes),
  limiteCredito: Number(data.limiteCredito || 0),
  status: data.status ?? "ativo",
  origem: data.origem ?? "balcao",
  ultimoAtendimento: normalizeString(data.ultimoAtendimento),
  vendedorId: data.vendedorId ?? null,
});

export const listenClientes = (
  callback: (clientes: Cliente[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(clientesRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const clientes = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Cliente[];

      callback(clientes);
    },
    (error) => {
      defaultSnapshotError("clientes", error);
      onError?.(error);
    }
  );
};

export const listenClientesPorVendedor = (
  vendedorId: string,
  callback: (clientes: Cliente[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(
    clientesRef,
    where("vendedorId", "==", vendedorId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const clientes = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Cliente[];

      callback(clientes);
    },
    (error) => {
      defaultSnapshotError("clientesPorVendedor", error);
      onError?.(error);
    }
  );
};

export const createCliente = async (data: ClienteInput, vendedorId?: string) => {
  await ensureUserPlanAllowsWrite(vendedorId || data.vendedorId || null);

  const payload = normalizeClienteInput({
    ...data,
    vendedorId: vendedorId || data.vendedorId || null,
  });

  return await addDoc(
    clientesRef,
    withTimestampsOnCreate({
      ...payload,
      totalCompras: 0,
    })
  );
};

export const updateCliente = async (id: string, data: ClienteInput) => {
  await ensureUserPlanAllowsWrite(data.vendedorId || null);

  const payload = normalizeClienteInput(data);

  return await updateDoc(
    doc(db, "clientes", id),
    withTimestampOnUpdate(payload)
  );
};

export const deleteCliente = async (id: string, authUid?: string | null) => {
  await ensureUserPlanAllowsWrite(authUid || null);
  return await deleteDoc(doc(db, "clientes", id));
};

// ===== CATEGORIAS =====
export interface Categoria {
  id?: string;
  nome: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type CategoriaInput = {
  nome: string;
  authUid?: string | null;
};

const categoriasRef = collection(db, "categorias");

export const createCategoria = async (data: CategoriaInput) => {
  await ensureUserPlanAllowsWrite(data.authUid || null);

  return await addDoc(
    categoriasRef,
    withTimestampsOnCreate({
      nome: normalizeString(data.nome),
    })
  );
};

export const updateCategoria = async (id: string, data: CategoriaInput) => {
  await ensureUserPlanAllowsWrite(data.authUid || null);

  return await updateDoc(
    doc(db, "categorias", id),
    withTimestampOnUpdate({
      nome: normalizeString(data.nome),
    })
  );
};

export const deleteCategoria = async (id: string, authUid?: string | null) => {
  await ensureUserPlanAllowsWrite(authUid || null);
  return await deleteDoc(doc(db, "categorias", id));
};

export const listenCategorias = (
  callback: (categorias: Categoria[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(categoriasRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const categorias = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Categoria[];

      callback(categorias);
    },
    (error) => {
      defaultSnapshotError("categorias", error);
      onError?.(error);
    }
  );
};

// ===== PRODUTOS =====
export type UnidadeProduto = "un" | "kg" | "lt" | "cx" | "pct";
export type EstadoProduto = "ativo" | "inativo";

export interface Produto {
  id?: string;
  nome: string;
  categoria: string;
  fornecedor: string;
  marca?: string;
  sku?: string;
  codigoBarras?: string;
  unidade: UnidadeProduto;
  precoCompra: number;
  precoVenda: number;
  stock: number;
  stockMinimo?: number;
  stockMaximo?: number;
  localizacao?: string;
  estado?: EstadoProduto;
  descricao?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type ProdutoInput = Omit<Produto, "id" | "createdAt" | "updatedAt"> & {
  authUid?: string | null;
};

const produtosRef = collection(db, "produtos");

const normalizeProdutoInput = (data: ProdutoInput): ProdutoInput => ({
  nome: normalizeString(data.nome),
  categoria: normalizeString(data.categoria),
  fornecedor: normalizeString(data.fornecedor),
  marca: normalizeString(data.marca),
  sku: normalizeString(data.sku),
  codigoBarras: normalizeString(data.codigoBarras),
  unidade: data.unidade ?? "un",
  precoCompra: Number(data.precoCompra || 0),
  precoVenda: Number(data.precoVenda || 0),
  stock: Number(data.stock || 0),
  stockMinimo: Number(data.stockMinimo || 0),
  stockMaximo: Number(data.stockMaximo || 0),
  localizacao: normalizeString(data.localizacao),
  estado: data.estado ?? "ativo",
  descricao: normalizeString(data.descricao),
  authUid: data.authUid ?? null,
});

export const createProduto = async (data: ProdutoInput) => {
  await ensureUserPlanAllowsWrite(data.authUid || null);

  const payload = normalizeProdutoInput(data);
  const { authUid, ...safePayload } = payload;

  return await addDoc(produtosRef, withTimestampsOnCreate(safePayload));
};

export const updateProduto = async (id: string, data: ProdutoInput) => {
  await ensureUserPlanAllowsWrite(data.authUid || null);

  const payload = normalizeProdutoInput(data);
  const { authUid, ...safePayload } = payload;

  return await updateDoc(
    doc(db, "produtos", id),
    withTimestampOnUpdate(safePayload)
  );
};

export const deleteProduto = async (id: string, authUid?: string | null) => {
  await ensureUserPlanAllowsWrite(authUid || null);
  return await deleteDoc(doc(db, "produtos", id));
};

export const getProduto = async (id: string) => {
  const ref = doc(db, "produtos", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as Produto;
};

export const listenProdutos = (
  callback: (produtos: Produto[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(produtosRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const produtos = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Produto[];

      callback(produtos);
    },
    (error) => {
      defaultSnapshotError("produtos", error);
      onError?.(error);
    }
  );
};

export const listenProdutosAtivos = (
  callback: (produtos: Produto[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(produtosRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const produtos = snapshot.docs
        .map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as Produto
        )
        .filter((produto) => (produto.estado || "ativo") === "ativo");

      callback(produtos);
    },
    (error) => {
      defaultSnapshotError("produtosAtivos", error);
      onError?.(error);
    }
  );
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
  valorRecebido?: number | null;
  troco?: number | null;
  vendedorId?: string | null;
  motivoCancelamento?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type VendaInput = Omit<Venda, "id" | "createdAt" | "updatedAt">;

const vendasRef = collection(db, "vendas");

export const createVenda = async (data: VendaInput) => {
  await ensureUserPlanAllowsWrite(data.vendedorId || null);

  return await runTransaction(db, async (transaction) => {
    if (data.status === "concluida") {
      for (const item of data.produtos) {
        const produtoRef = doc(db, "produtos", item.produtoId);
        const produtoSnap = await transaction.get(produtoRef);

        if (!produtoSnap.exists()) {
          throw new Error(`Produto não encontrado: ${item.nome}`);
        }

        const produtoData = produtoSnap.data() as Produto;
        const stockAtual = produtoData.stock || 0;
        const estadoProduto = produtoData.estado || "ativo";

        if (estadoProduto !== "ativo") {
          throw new Error(`O produto "${item.nome}" está inativo e não pode ser vendido.`);
        }

        if (stockAtual < item.quantidade) {
          throw new Error(
            `Stock insuficiente para o produto "${item.nome}". Disponível: ${stockAtual}`
          );
        }
      }
    }

    const vendaRef = doc(vendasRef);

    const payload = removeUndefinedFields({
      ...data,
      clienteNome: normalizeString(data.clienteNome),
      motivoCancelamento: normalizeString(data.motivoCancelamento),
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });

    transaction.set(vendaRef, payload);

    if (data.status === "concluida") {
      for (const item of data.produtos) {
        const produtoRef = doc(db, "produtos", item.produtoId);

        transaction.update(produtoRef, {
          stock: increment(-item.quantidade),
          updatedAt: nowTimestamp(),
        });
      }

      if (data.clienteId) {
        const clienteRef = doc(db, "clientes", data.clienteId);
        transaction.update(clienteRef, {
          totalCompras: increment(data.total),
          updatedAt: nowTimestamp(),
        });
      }
    }

    return vendaRef;
  });
};

export const updateVendaStatus = async (
  vendaId: string,
  status: Venda["status"],
  motivoCancelamento?: string
) => {
  return await runTransaction(db, async (transaction) => {
    const vendaRef = doc(db, "vendas", vendaId);
    const vendaSnap = await transaction.get(vendaRef);

    if (!vendaSnap.exists()) {
      throw new Error("Venda não encontrada.");
    }

    const vendaData = vendaSnap.data() as Venda;
    const statusAtual = vendaData.status;

    if (vendaData.vendedorId) {
      const vendedorRef = doc(db, "usuarios", vendaData.vendedorId);
      const vendedorSnap = await transaction.get(vendedorRef);

      if (!vendedorSnap.exists()) {
        throw new Error("Utilizador da venda não encontrado.");
      }

      const vendedorData = vendedorSnap.data();

      if (userPlanBlocked(vendedorData)) {
        throw new Error("O plano do utilizador expirou ou está bloqueado.");
      }
    }

    const updatePayload = removeUndefinedFields(
      withTimestampOnUpdate({
        status,
        motivoCancelamento: normalizeString(motivoCancelamento),
      })
    );

    if (statusAtual === status) {
      transaction.update(vendaRef, updatePayload);
      return;
    }

    if (status === "cancelada" && statusAtual === "concluida") {
      for (const item of vendaData.produtos) {
        const produtoRef = doc(db, "produtos", item.produtoId);
        transaction.update(produtoRef, {
          stock: increment(item.quantidade),
          updatedAt: nowTimestamp(),
        });
      }

      if (vendaData.clienteId) {
        const clienteRef = doc(db, "clientes", vendaData.clienteId);
        transaction.update(clienteRef, {
          totalCompras: increment(-(vendaData.total || 0)),
          updatedAt: nowTimestamp(),
        });
      }
    }

    transaction.update(vendaRef, updatePayload);
  });
};

export const listenVendas = (
  callback: (vendas: Venda[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(vendasRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const vendas = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Venda[];

      callback(vendas);
    },
    (error) => {
      defaultSnapshotError("vendas", error);
      onError?.(error);
    }
  );
};

export const listenVendasPorVendedor = (
  vendedorId: string,
  callback: (vendas: Venda[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(
    vendasRef,
    where("vendedorId", "==", vendedorId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const vendas = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Venda[];

      callback(vendas);
    },
    (error) => {
      defaultSnapshotError("vendasPorVendedor", error);
      onError?.(error);
    }
  );
};

// ===== USUÁRIOS =====
export interface Usuario {
  id?: string;
  authUid: string;
  nome: string;
  email: string;
  tipo: "admin" | "vendedor";
  telefone?: string;
  ativo: boolean;
  limiteDesconto?: number;
  idioma?: "pt" | "en" | "es";
  plano?: "trial" | "pro" | "enterprise";
  statusPlano?: "ativo" | "expirado" | "bloqueado";
  trialInicio?: FirestoreDate | string | null;
  trialFim?: FirestoreDate | string | null;
  dataRegistro?: FirestoreDate;
  ultimoAcesso?: FirestoreDate;
}

export type UsuarioInput = Omit<Usuario, "id" | "dataRegistro" | "ultimoAcesso">;

const usuariosRef = collection(db, "usuarios");

export const createUsuario = async (data: UsuarioInput) => {
  const ref = doc(db, "usuarios", data.authUid);

  await setDoc(
    ref,
    removeUndefinedFields({
      ...data,
      nome: normalizeString(data.nome),
      email: normalizeString(data.email),
      telefone: normalizeString(data.telefone),
      idioma: data.idioma ?? "pt",
      plano: data.plano ?? "trial",
      statusPlano: data.statusPlano ?? "ativo",
      dataRegistro: serverTimestamp(),
      ultimoAcesso: null,
    }),
    { merge: true }
  );

  return ref;
};

export const getUsuario = async (uid: string) => {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as Usuario;
};

export const listenUsuarios = (
  callback: (usuarios: Usuario[]) => void,
  onError?: SnapshotErrorHandler
): Unsubscribe => {
  const q = query(usuariosRef, orderBy("dataRegistro", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const usuarios = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Usuario[];

      callback(usuarios);
    },
    (error) => {
      defaultSnapshotError("usuarios", error);
      onError?.(error);
    }
  );
};

export const updateUsuario = async (
  uid: string,
  data: Partial<Omit<Usuario, "id" | "authUid" | "dataRegistro">>
) => {
  const payload = removeUndefinedFields({
    ...data,
    nome: data.nome !== undefined ? normalizeString(data.nome) : undefined,
    email: data.email !== undefined ? normalizeString(data.email) : undefined,
    telefone:
      data.telefone !== undefined ? normalizeString(data.telefone) : undefined,
  });

  return await updateDoc(doc(db, "usuarios", uid), payload);
};

export const updateUltimoAcessoUsuario = async (uid: string) => {
  return await updateDoc(doc(db, "usuarios", uid), {
    ultimoAcesso: serverTimestamp(),
  });
};

// ===== UTILITÁRIOS PRODUTO =====
export const calcularMargemProduto = (
  produto: Pick<Produto, "precoCompra" | "precoVenda">
) => {
  if (!produto.precoCompra || produto.precoCompra <= 0) return 0;
  return Number(
    (((produto.precoVenda - produto.precoCompra) / produto.precoCompra) * 100).toFixed(1)
  );
};

export const calcularValorTotalProduto = (
  produto: Pick<Produto, "precoVenda" | "stock">
) => {
  return Number((produto.precoVenda || 0) * (produto.stock || 0));
};

export const getStatusStockProduto = (
  produto: Pick<Produto, "stock" | "stockMinimo" | "stockMaximo">
) => {
  const stock = produto.stock || 0;
  const stockMinimo = produto.stockMinimo || 0;
  const stockMaximo = produto.stockMaximo || 0;

  if (stock === 0) return "sem-stock";
  if (stockMinimo > 0 && stock <= stockMinimo) return "baixo-stock";
  if (stockMaximo > 0 && stock > stockMaximo) return "excesso-stock";
  return "normal";
};

export const produtoMatchesSearch = (produto: Produto, termo: string) => {
  const q = normalizeLower(termo);
  if (!q) return true;

  return [
    produto.nome,
    produto.categoria,
    produto.fornecedor,
    produto.marca,
    produto.sku,
    produto.codigoBarras,
    produto.localizacao,
    produto.descricao,
    produto.id,
  ]
    .map((item) => normalizeLower(item))
    .some((item) => item.includes(q));
};