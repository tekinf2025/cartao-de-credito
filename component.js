// <stdin>
import React, { useState, useEffect } from "https://esm.sh/react@18.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js?deps=react@18.2.0,react-dom@18.2.0";
var supabaseUrl = "https://ivumtyhdkjurerknjnpt.supabase.co";
var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dW10eWhka2p1cmVya25qbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjUyMjMsImV4cCI6MjA2NTk0MTIyM30.rbkqMbSYczGbJdGSjUvARGLIU3Gf-B9q0RWm0vW99Bs";
var supabase = createClient(supabaseUrl, supabaseAnonKey);
var CartaoGerenciamento = () => {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    status: "",
    dataInicio: "",
    dataFim: "",
    ordenacaoDias: "asc"
    // 'asc' para A-Z, 'desc' para Z-A
  });
  const [showModal, setShowModal] = useState(false);
  const [novoLancamento, setNovoLancamento] = useState({
    estabelecimento: "1028151869",
    bandeira: "",
    valor_bruto: "",
    tipo_pagamento: "",
    parcelas: 1,
    status: "Agendado"
  });
  const [editandoLancamento, setEditandoLancamento] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  useEffect(() => {
    fetchLancamentos();
  }, []);
  useEffect(() => {
    aplicarFiltros();
  }, [filtros.ordenacaoDias]);
  const fetchLancamentos = async () => {
    try {
      setLoading(true);
      let query = supabase.from("cartao_lancamentos").select("*");
      query = query.order("data_pagamento", { ascending: filtros.ordenacaoDias === "asc" });
      const { data, error: error2 } = await query;
      if (error2) throw error2;
      const lancamentosOrdenados = ordenarLancamentos(data || []);
      setLancamentos(lancamentosOrdenados);
    } catch (err) {
      setError(err.message);
      console.error("Erro ao buscar lan\xE7amentos:", err);
    } finally {
      setLoading(false);
    }
  };
  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      let query = supabase.from("cartao_lancamentos").select("*");
      if (filtros.status) {
        query = query.eq("status", filtros.status);
      }
      if (filtros.dataInicio) {
        query = query.gte("data_pagamento", filtros.dataInicio);
      }
      if (filtros.dataFim) {
        query = query.lte("data_pagamento", filtros.dataFim);
      }
      query = query.order("data_pagamento", { ascending: filtros.ordenacaoDias === "asc" });
      const { data, error: error2 } = await query;
      if (error2) throw error2;
      const lancamentosOrdenados = ordenarLancamentos(data || []);
      setLancamentos(lancamentosOrdenados);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const limparFiltros = () => {
    setFiltros({
      status: "",
      dataInicio: "",
      dataFim: "",
      ordenacaoDias: "asc"
    });
    fetchLancamentos();
  };
  const calcularValorLiquido = (valorBruto, tipoPagamento, parcelas = 1) => {
    const valor = parseFloat(valorBruto) || 0;
    const taxaJuros = 4.49 / 100;
    if (tipoPagamento === "credito_vista") {
      return valor * (1 - taxaJuros);
    } else if (tipoPagamento === "credito_parcelado") {
      const valorPorParcela = valor / parcelas;
      return valorPorParcela * (1 - taxaJuros);
    }
    return 0;
  };
  const criarLancamentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const valorBruto = parseFloat(novoLancamento.valor_bruto) || 0;
      if (novoLancamento.tipo_pagamento === "credito_vista") {
        const valorLiquido = calcularValorLiquido(valorBruto, "credito_vista");
        const dataRecebimento = /* @__PURE__ */ new Date();
        dataRecebimento.setDate(dataRecebimento.getDate() + 30);
        const lancamento = {
          id: Date.now().toString(),
          // Gerar ID único baseado em timestamp
          estabelecimento: novoLancamento.estabelecimento,
          bandeira: novoLancamento.bandeira,
          valor_liquido: parseFloat(valorLiquido.toFixed(2)),
          data_pagamento: dataRecebimento.toISOString().split("T")[0],
          status: novoLancamento.status
        };
        console.log("Inserindo lan\xE7amento \xE0 vista (sem ID):", lancamento);
        const { data, error: error2 } = await supabase.from("cartao_lancamentos").insert([lancamento]).select();
        if (error2) {
          console.error("Erro ao inserir lan\xE7amento:", error2);
          throw error2;
        }
        console.log("Lan\xE7amento inserido com sucesso:", data);
        console.log("Lan\xE7amento inserido com sucesso:", data);
      } else if (novoLancamento.tipo_pagamento === "credito_parcelado") {
        const valorLiquidoPorParcela = calcularValorLiquido(valorBruto, "credito_parcelado", novoLancamento.parcelas);
        console.log(`Inserindo ${novoLancamento.parcelas} parcelas...`);
        for (let i = 1; i <= novoLancamento.parcelas; i++) {
          const dataRecebimento = /* @__PURE__ */ new Date();
          dataRecebimento.setDate(dataRecebimento.getDate() + 30 * i);
          const lancamento = {
            id: `${Date.now()}_${i}`,
            // Gerar ID único para cada parcela
            estabelecimento: novoLancamento.estabelecimento,
            bandeira: `${novoLancamento.bandeira} ${String(i).padStart(2, "0")}/${String(novoLancamento.parcelas).padStart(2, "0")}`,
            valor_liquido: parseFloat(valorLiquidoPorParcela.toFixed(2)),
            data_pagamento: dataRecebimento.toISOString().split("T")[0],
            status: novoLancamento.status
          };
          console.log(`Inserindo parcela ${i}/${novoLancamento.parcelas} (sem ID):`, lancamento);
          const { data, error: error2 } = await supabase.from("cartao_lancamentos").insert([lancamento]).select();
          if (error2) {
            console.error(`Erro ao inserir parcela ${i}:`, error2);
            throw error2;
          }
          console.log(`Parcela ${i} inserida com sucesso:`, data);
          if (i < novoLancamento.parcelas) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }
      console.log("Todos os lan\xE7amentos foram inseridos com sucesso!");
      setNovoLancamento({
        estabelecimento: "1028151869",
        bandeira: "",
        valor_bruto: "",
        tipo_pagamento: "",
        parcelas: 1,
        status: "Agendado"
      });
      setShowModal(false);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchLancamentos();
    } catch (err) {
      setError(`Erro ao criar lan\xE7amento: ${err.message}`);
      console.error("Erro detalhado:", {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
    } finally {
      setLoading(false);
    }
  };
  const formatarData = (data) => {
    if (!data) return "";
    const dataComHora = data.includes("T") ? data : data + "T00:00:00";
    return new Date(dataComHora).toLocaleDateString("pt-BR");
  };
  const calcularDiasParaReceber = (dataRecebimento) => {
    if (!dataRecebimento) return 0;
    const hoje = /* @__PURE__ */ new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataComHora = dataRecebimento.includes("T") ? dataRecebimento : dataRecebimento + "T00:00:00";
    const dataReceber = new Date(dataComHora);
    dataReceber.setHours(0, 0, 0, 0);
    const diferencaTempo = dataReceber.getTime() - hoje.getTime();
    const diferencaDias = Math.ceil(diferencaTempo / (1e3 * 3600 * 24));
    return diferencaDias;
  };
  const formatarValor = (valor) => {
    if (!valor) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor);
  };
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "agendado":
        return "bg-yellow-900 text-yellow-200 border border-yellow-600";
      case "recebido":
        return "bg-green-900 text-green-200 border border-green-600";
      default:
        return "bg-gray-700 text-gray-200 border border-gray-500";
    }
  };
  const calcularTotais = () => {
    const agendados = lancamentos.filter((l) => l.status?.toLowerCase() === "agendado");
    const recebidos = lancamentos.filter((l) => l.status?.toLowerCase() === "recebido");
    const totalAgendados = agendados.reduce((sum, l) => sum + (parseFloat(l.valor_liquido) || 0), 0);
    const totalRecebidos = recebidos.reduce((sum, l) => sum + (parseFloat(l.valor_liquido) || 0), 0);
    const totalGeral = totalAgendados + totalRecebidos;
    return {
      agendados: {
        quantidade: agendados.length,
        valor: totalAgendados
      },
      recebidos: {
        quantidade: recebidos.length,
        valor: totalRecebidos
      },
      total: {
        quantidade: lancamentos.length,
        valor: totalGeral
      }
    };
  };
  const ordenarLancamentos = (lancamentos2) => {
    const agendados = lancamentos2.filter((l) => l.status?.toLowerCase() !== "recebido");
    const recebidos = lancamentos2.filter((l) => l.status?.toLowerCase() === "recebido");
    const ordenarPorData = (items) => {
      return items.sort((a, b) => {
        const dataA = /* @__PURE__ */ new Date(a.data_pagamento + "T00:00:00");
        const dataB = /* @__PURE__ */ new Date(b.data_pagamento + "T00:00:00");
        if (filtros.ordenacaoDias === "asc") {
          return dataA - dataB;
        } else {
          return dataB - dataA;
        }
      });
    };
    return [
      ...ordenarPorData(agendados),
      ...ordenarPorData(recebidos)
    ];
  };
  const totais = calcularTotais();
  const alterarStatus = async (id, novoStatus) => {
    try {
      setLoading(true);
      const { error: error2 } = await supabase.from("cartao_lancamentos").update({ status: novoStatus }).eq("id", id);
      if (error2) throw error2;
      await fetchLancamentos();
    } catch (err) {
      setError(`Erro ao alterar status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const abrirEdicao = (lancamento) => {
    setEditandoLancamento({
      id: lancamento.id,
      estabelecimento: lancamento.estabelecimento,
      bandeira: lancamento.bandeira,
      valor_liquido: lancamento.valor_liquido,
      data_pagamento: lancamento.data_pagamento,
      status: lancamento.status
    });
    setShowEditModal(true);
  };
  const salvarEdicao = async () => {
    try {
      setLoading(true);
      const { error: error2 } = await supabase.from("cartao_lancamentos").update({
        estabelecimento: editandoLancamento.estabelecimento,
        bandeira: editandoLancamento.bandeira,
        valor_liquido: parseFloat(editandoLancamento.valor_liquido),
        data_pagamento: editandoLancamento.data_pagamento,
        status: editandoLancamento.status
      }).eq("id", editandoLancamento.id);
      if (error2) throw error2;
      setShowEditModal(false);
      setEditandoLancamento(null);
      await fetchLancamentos();
    } catch (err) {
      setError(`Erro ao editar lan\xE7amento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  if (loading && lancamentos.length === 0) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center h-64 bg-gray-900" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" }));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-900 p-6" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-white" }, "Lan\xE7amentos"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-300" }, "Gerencie todos os seus receb\xEDveis de cart\xE3o")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowModal(true),
      className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
    },
    "Novo Lan\xE7amento"
  ))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 text-white" }, "Filtros"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Status"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: filtros.status,
      onChange: (e) => setFiltros({ ...filtros, status: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Todos"),
    /* @__PURE__ */ React.createElement("option", { value: "Agendado" }, "Agendado"),
    /* @__PURE__ */ React.createElement("option", { value: "Recebido" }, "Recebido")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Ordenar Dias p/ Receber"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: filtros.ordenacaoDias,
      onChange: (e) => setFiltros({ ...filtros, ordenacaoDias: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    },
    /* @__PURE__ */ React.createElement("option", { value: "asc" }, "Menor para Maior (A-Z)"),
    /* @__PURE__ */ React.createElement("option", { value: "desc" }, "Maior para Menor (Z-A)")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Data In\xEDcio"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: filtros.dataInicio,
      onChange: (e) => setFiltros({ ...filtros, dataInicio: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Data Fim"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: filtros.dataFim,
      onChange: (e) => setFiltros({ ...filtros, dataFim: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: aplicarFiltros,
      className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
    },
    "Aplicar Filtros"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: limparFiltros,
      className: "bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors shadow-lg"
    },
    "Limpar Filtros"
  ))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, "Total de Lan\xE7amentos"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-white" }, totais.total.quantidade), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-blue-400" }, formatarValor(totais.total.valor))), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, "Agendados"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-yellow-400" }, totais.agendados.quantidade), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-yellow-400" }, formatarValor(totais.agendados.valor))), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, "Recebidos"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-green-400" }, totais.recebidos.quantidade), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-green-400" }, formatarValor(totais.recebidos.valor))))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700" }, error && /* @__PURE__ */ React.createElement("div", { className: "bg-red-900 border-l-4 border-red-500 p-4 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement("div", { className: "ml-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-200" }, "Erro ao carregar dados: ", error)))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "min-w-full divide-y divide-gray-600" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-700" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, "Data Pagamento"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement("span", null, "Dias p/ Receber"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const novaOrdenacao = filtros.ordenacaoDias === "asc" ? "desc" : "asc";
        setFiltros({ ...filtros, ordenacaoDias: novaOrdenacao });
      },
      className: "text-gray-400 hover:text-white transition-colors",
      title: filtros.ordenacaoDias === "asc" ? "Ordenar Z-A" : "Ordenar A-Z"
    },
    /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, filtros.ordenacaoDias === "asc" ? /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 15l7-7 7 7" }) : /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }))
  ))), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, "Estabelecimento"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, "Bandeira"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, "Valor L\xEDquido"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" }, "A\xE7\xF5es"))), /* @__PURE__ */ React.createElement("tbody", { className: "bg-gray-800 divide-y divide-gray-600" }, lancamentos.map((lancamento, index) => {
    const isFirstRecebido = lancamento.status?.toLowerCase() === "recebido" && (index === 0 || lancamentos[index - 1].status?.toLowerCase() !== "recebido");
    return /* @__PURE__ */ React.createElement(React.Fragment, { key: lancamento.id }, isFirstRecebido && lancamentos.some((l) => l.status?.toLowerCase() !== "recebido") && /* @__PURE__ */ React.createElement("tr", { className: "bg-gray-600" }, /* @__PURE__ */ React.createElement("td", { colSpan: "7", className: "px-6 py-2 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center space-x-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 h-px bg-gray-500" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 text-sm font-medium" }, "Lan\xE7amentos Recebidos"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 h-px bg-gray-500" })))), /* @__PURE__ */ React.createElement("tr", { className: `hover:bg-gray-700 transition-colors ${lancamento.status?.toLowerCase() === "recebido" ? "bg-gray-750 opacity-75" : ""}` }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-100" }, formatarData(lancamento.data_pagamento)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-orange-400" }, (() => {
      const diasCalculados = calcularDiasParaReceber(lancamento.data_pagamento);
      if (lancamento.status?.toLowerCase() === "recebido") {
        return /* @__PURE__ */ React.createElement("span", { className: "text-green-400" }, "\u2713 Recebido");
      } else if (diasCalculados < 0) {
        return /* @__PURE__ */ React.createElement("span", { className: "text-red-400" }, Math.abs(diasCalculados), " dias em atraso");
      } else if (diasCalculados === 0) {
        return /* @__PURE__ */ React.createElement("span", { className: "text-green-400" }, "Hoje");
      } else {
        return `${diasCalculados} dias`;
      }
    })()), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-100" }, lancamento.estabelecimento || "-"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-100" }, lancamento.bandeira || "-"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400" }, formatarValor(lancamento.valor_liquido)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lancamento.status)}` }, lancamento.status || "Agendado")), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-300" }, /* @__PURE__ */ React.createElement("div", { className: "flex space-x-2" }, lancamento.status?.toLowerCase() === "agendado" ? /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => alterarStatus(lancamento.id, "Recebido"),
        className: "flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors",
        title: "Marcar como Recebido"
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-3 h-3 mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" })),
      "Receber"
    ) : /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => alterarStatus(lancamento.id, "Agendado"),
        className: "flex items-center px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors",
        title: "Marcar como Agendado"
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-3 h-3 mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" })),
      "Agendar"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => abrirEdicao(lancamento),
        className: "flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors",
        title: "Editar Lan\xE7amento"
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-3 h-3 mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" })),
      "Editar"
    )))));
  })))), lancamentos.length === 0 && !loading && /* @__PURE__ */ React.createElement("div", { className: "text-center py-12" }, /* @__PURE__ */ React.createElement("svg", { className: "mx-auto h-12 w-12 text-gray-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" })), /* @__PURE__ */ React.createElement("h3", { className: "mt-2 text-sm font-medium text-gray-200" }, "Nenhum lan\xE7amento encontrado"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-gray-400" }, error ? "Verifique sua conex\xE3o e tente novamente." : "Comece criando um novo lan\xE7amento."))), showModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-600 max-h-screen overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-white" }, "Novo Lan\xE7amento"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowModal(false),
      className: "text-gray-400 hover:text-white transition-colors"
    },
    /* @__PURE__ */ React.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }))
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Estabelecimento *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: novoLancamento.estabelecimento,
      onChange: (e) => setNovoLancamento({ ...novoLancamento, estabelecimento: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      placeholder: "Nome do estabelecimento",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Bandeira *"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: novoLancamento.bandeira,
      onChange: (e) => setNovoLancamento({ ...novoLancamento, bandeira: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione a bandeira"),
    /* @__PURE__ */ React.createElement("option", { value: "Visa" }, "Visa"),
    /* @__PURE__ */ React.createElement("option", { value: "Mastercard" }, "Mastercard"),
    /* @__PURE__ */ React.createElement("option", { value: "Elo" }, "Elo"),
    /* @__PURE__ */ React.createElement("option", { value: "American Express" }, "American Express"),
    /* @__PURE__ */ React.createElement("option", { value: "Hipercard" }, "Hipercard")
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Valor Bruto *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      step: "0.01",
      value: novoLancamento.valor_bruto,
      onChange: (e) => setNovoLancamento({ ...novoLancamento, valor_bruto: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      placeholder: "0,00",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Tipo de Pagamento *"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: novoLancamento.tipo_pagamento,
      onChange: (e) => setNovoLancamento({ ...novoLancamento, tipo_pagamento: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione o tipo"),
    /* @__PURE__ */ React.createElement("option", { value: "credito_vista" }, "Cr\xE9dito \xE0 Vista"),
    /* @__PURE__ */ React.createElement("option", { value: "credito_parcelado" }, "Cr\xE9dito Parcelado")
  )), novoLancamento.tipo_pagamento === "credito_parcelado" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Quantidade de Parcelas *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "2",
      max: "12",
      value: novoLancamento.parcelas,
      onChange: (e) => setNovoLancamento({ ...novoLancamento, parcelas: parseInt(e.target.value) || 1 }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Status *"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: novoLancamento.status,
      onChange: (e) => setNovoLancamento({ ...novoLancamento, status: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    },
    /* @__PURE__ */ React.createElement("option", { value: "Agendado" }, "Agendado"),
    /* @__PURE__ */ React.createElement("option", { value: "Recebido" }, "Recebido")
  ))), novoLancamento.valor_bruto && novoLancamento.tipo_pagamento && /* @__PURE__ */ React.createElement("div", { className: "bg-gray-700 rounded-lg p-4 mb-6 border border-gray-600" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-medium text-gray-300 mb-3" }, "Preview dos C\xE1lculos"), novoLancamento.tipo_pagamento === "credito_vista" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Valor Bruto:"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, formatarValor(novoLancamento.valor_bruto))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Taxa (4,49%):"), /* @__PURE__ */ React.createElement("span", { className: "text-red-400" }, "-", formatarValor(novoLancamento.valor_bruto * 0.0449))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-t border-gray-600 pt-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 font-medium" }, "Valor L\xEDquido:"), /* @__PURE__ */ React.createElement("span", { className: "text-green-400 font-medium" }, formatarValor(calcularValorLiquido(novoLancamento.valor_bruto, "credito_vista")))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Recebimento:"), /* @__PURE__ */ React.createElement("span", { className: "text-blue-400" }, (() => {
    const dataRecebimento = /* @__PURE__ */ new Date();
    dataRecebimento.setDate(dataRecebimento.getDate() + 30);
    return formatarData(dataRecebimento.toISOString().split("T")[0]);
  })()))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-3 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Valor Total Bruto:"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, formatarValor(novoLancamento.valor_bruto))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Parcelas:"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, novoLancamento.parcelas, "x")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Valor por Parcela (Bruto):"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, formatarValor(novoLancamento.valor_bruto / novoLancamento.parcelas))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Taxa por Parcela (4,49%):"), /* @__PURE__ */ React.createElement("span", { className: "text-red-400" }, "-", formatarValor(novoLancamento.valor_bruto / novoLancamento.parcelas * 0.0449))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-t border-gray-600 pt-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 font-medium" }, "Valor L\xEDquido por Parcela:"), /* @__PURE__ */ React.createElement("span", { className: "text-green-400 font-medium" }, formatarValor(calcularValorLiquido(novoLancamento.valor_bruto, "credito_parcelado", novoLancamento.parcelas)))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Recebimento:"), /* @__PURE__ */ React.createElement("span", { className: "text-blue-400" }, (() => {
    const datas = [];
    for (let i = 1; i <= Math.min(novoLancamento.parcelas, 3); i++) {
      const dataRecebimento = /* @__PURE__ */ new Date();
      dataRecebimento.setDate(dataRecebimento.getDate() + 30 * i);
      datas.push(formatarData(dataRecebimento.toISOString().split("T")[0]));
    }
    return datas.join(", ") + (novoLancamento.parcelas > 3 ? "..." : "");
  })())))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowModal(false),
      className: "px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
    },
    "Cancelar"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: criarLancamentos,
      disabled: !novoLancamento.estabelecimento || !novoLancamento.bandeira || !novoLancamento.valor_bruto || !novoLancamento.tipo_pagamento || !novoLancamento.status,
      className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
    },
    "Criar Lan\xE7amento(s)"
  ))))), showEditModal && editandoLancamento && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-600 max-h-screen overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-white" }, "Editar Lan\xE7amento"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowEditModal(false);
        setEditandoLancamento(null);
      },
      className: "text-gray-400 hover:text-white transition-colors"
    },
    /* @__PURE__ */ React.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }))
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Estabelecimento *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: editandoLancamento.estabelecimento,
      onChange: (e) => setEditandoLancamento({ ...editandoLancamento, estabelecimento: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Bandeira *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: editandoLancamento.bandeira,
      onChange: (e) => setEditandoLancamento({ ...editandoLancamento, bandeira: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Valor L\xEDquido *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      step: "0.01",
      value: editandoLancamento.valor_liquido,
      onChange: (e) => setEditandoLancamento({ ...editandoLancamento, valor_liquido: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Data de Pagamento *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: editandoLancamento.data_pagamento,
      onChange: (e) => setEditandoLancamento({ ...editandoLancamento, data_pagamento: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-300 mb-1" }, "Status *"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: editandoLancamento.status,
      onChange: (e) => setEditandoLancamento({ ...editandoLancamento, status: e.target.value }),
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      required: true
    },
    /* @__PURE__ */ React.createElement("option", { value: "Agendado" }, "Agendado"),
    /* @__PURE__ */ React.createElement("option", { value: "Recebido" }, "Recebido")
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowEditModal(false);
        setEditandoLancamento(null);
      },
      className: "px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
    },
    "Cancelar"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: salvarEdicao,
      disabled: !editandoLancamento.estabelecimento || !editandoLancamento.bandeira || !editandoLancamento.valor_liquido || !editandoLancamento.data_pagamento || !editandoLancamento.status,
      className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
    },
    "Salvar Altera\xE7\xF5es"
  ))))), loading && lancamentos.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 rounded-lg p-4 flex items-center space-x-3 border border-gray-600 shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-200" }, "Carregando...")))));
};
var stdin_default = CartaoGerenciamento;
export {
  stdin_default as default
};
