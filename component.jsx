import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ivumtyhdkjurerknjnpt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dW10eWhka2p1cmVya25qbnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjUyMjMsImV4cCI6MjA2NTk0MTIyM30.rbkqMbSYczGbJdGSjUvARGLIU3Gf-B9q0RWm0vW99Bs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CartaoGerenciamento = () => {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    status: '',
    dataInicio: '',
    dataFim: '',
    ordenacaoDias: 'asc' // 'asc' para A-Z, 'desc' para Z-A
  });

  const [showModal, setShowModal] = useState(false);
  const [novoLancamento, setNovoLancamento] = useState({
    estabelecimento: '1028151869',
    bandeira: '',
    valor_bruto: '',
    tipo_pagamento: '',
    parcelas: 1,
    status: 'Agendado'
  });

  const [editandoLancamento, setEditandoLancamento] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchLancamentos();
  }, []);

  // Aplicar filtros quando a ordenação mudar
  useEffect(() => {
    aplicarFiltros();
  }, [filtros.ordenacaoDias]);

  const fetchLancamentos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('cartao_lancamentos')
        .select('*');

      // Aplicar ordenação por data de pagamento (A-Z por padrão)
      query = query.order('data_pagamento', { ascending: filtros.ordenacaoDias === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      
      // Aplicar ordenação personalizada: Recebidos no final
      const lancamentosOrdenados = ordenarLancamentos(data || []);
      setLancamentos(lancamentosOrdenados);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar lançamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      let query = supabase.from('cartao_lancamentos').select('*');

      // Filtro de Status
      if (filtros.status) {
        query = query.eq('status', filtros.status);
      }

      // Filtros de Data
      if (filtros.dataInicio) {
        query = query.gte('data_pagamento', filtros.dataInicio);
      }

      if (filtros.dataFim) {
        query = query.lte('data_pagamento', filtros.dataFim);
      }

      // Ordenação por data de pagamento
      query = query.order('data_pagamento', { ascending: filtros.ordenacaoDias === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      
      // Aplicar ordenação personalizada: Recebidos no final
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
      status: '',
      dataInicio: '',
      dataFim: '',
      ordenacaoDias: 'asc'
    });
    fetchLancamentos();
  };

  const calcularValorLiquido = (valorBruto, tipoPagamento, parcelas = 1) => {
    const valor = parseFloat(valorBruto) || 0;
    const taxaJuros = 4.49 / 100; // 4.49%
    
    if (tipoPagamento === 'credito_vista') {
      return valor * (1 - taxaJuros);
    } else if (tipoPagamento === 'credito_parcelado') {
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
      
      if (novoLancamento.tipo_pagamento === 'credito_vista') {
        // Crédito à vista - um único lançamento
        const valorLiquido = calcularValorLiquido(valorBruto, 'credito_vista');
        const dataRecebimento = new Date();
        dataRecebimento.setDate(dataRecebimento.getDate() + 30);

        const lancamento = {
          id: Date.now().toString(), // Gerar ID único baseado em timestamp
          estabelecimento: novoLancamento.estabelecimento,
          bandeira: novoLancamento.bandeira,
          valor_liquido: parseFloat(valorLiquido.toFixed(2)),
          data_pagamento: dataRecebimento.toISOString().split('T')[0],
          status: novoLancamento.status
        };

        console.log('Inserindo lançamento à vista (sem ID):', lancamento);
        
        // Inserir diretamente sem especificar ID
        const { data, error } = await supabase
          .from('cartao_lancamentos')
          .insert([lancamento])
          .select();

        if (error) {
          console.error('Erro ao inserir lançamento:', error);
          throw error;
        }
        
        console.log('Lançamento inserido com sucesso:', data);
        
        console.log('Lançamento inserido com sucesso:', data);
        
      } else if (novoLancamento.tipo_pagamento === 'credito_parcelado') {
        // Crédito parcelado - inserir uma parcela por vez
        const valorLiquidoPorParcela = calcularValorLiquido(valorBruto, 'credito_parcelado', novoLancamento.parcelas);
        
        console.log(`Inserindo ${novoLancamento.parcelas} parcelas...`);

        for (let i = 1; i <= novoLancamento.parcelas; i++) {
          const dataRecebimento = new Date();
          dataRecebimento.setDate(dataRecebimento.getDate() + (30 * i));

          const lancamento = {
            id: `${Date.now()}_${i}`, // Gerar ID único para cada parcela
            estabelecimento: novoLancamento.estabelecimento,
            bandeira: `${novoLancamento.bandeira} ${String(i).padStart(2, '0')}/${String(novoLancamento.parcelas).padStart(2, '0')}`,
            valor_liquido: parseFloat(valorLiquidoPorParcela.toFixed(2)),
            data_pagamento: dataRecebimento.toISOString().split('T')[0],
            status: novoLancamento.status
          };

          console.log(`Inserindo parcela ${i}/${novoLancamento.parcelas} (sem ID):`, lancamento);
          
          // Inserir diretamente sem especificar ID
          const { data, error } = await supabase
            .from('cartao_lancamentos')
            .insert([lancamento])
            .select();

          if (error) {
            console.error(`Erro ao inserir parcela ${i}:`, error);
            throw error;
          }
          
          console.log(`Parcela ${i} inserida com sucesso:`, data);

          // Delay entre inserções para evitar sobrecarga
          if (i < novoLancamento.parcelas) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      console.log('Todos os lançamentos foram inseridos com sucesso!');

      // Limpar formulário e fechar modal
      setNovoLancamento({
        estabelecimento: '1028151869',
        bandeira: '',
        valor_bruto: '',
        tipo_pagamento: '',
        parcelas: 1,
        status: 'Agendado'
      });
      setShowModal(false);
      
      // Aguardar antes de recarregar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarregar lista
      await fetchLancamentos();
      
    } catch (err) {
      setError(`Erro ao criar lançamento: ${err.message}`);
      console.error('Erro detalhado:', {
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
    if (!data) return '';
    // Adicionar 'T00:00:00' para evitar problemas de timezone
    const dataComHora = data.includes('T') ? data : data + 'T00:00:00';
    return new Date(dataComHora).toLocaleDateString('pt-BR');
  };

  // Função para calcular dias restantes até o recebimento
  const calcularDiasParaReceber = (dataRecebimento) => {
    if (!dataRecebimento) return 0;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas da data
    
    // Garantir que a data de recebimento está no formato correto
    const dataComHora = dataRecebimento.includes('T') ? dataRecebimento : dataRecebimento + 'T00:00:00';
    const dataReceber = new Date(dataComHora);
    dataReceber.setHours(0, 0, 0, 0);
    
    // Calcular diferença em dias
    const diferencaTempo = dataReceber.getTime() - hoje.getTime();
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));
    
    return diferencaDias;
  };

  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'agendado':
        return 'bg-yellow-900 text-yellow-200 border border-yellow-600';
      case 'recebido':
        return 'bg-green-900 text-green-200 border border-green-600';
      default:
        return 'bg-gray-700 text-gray-200 border border-gray-500';
    }
  };

  // Calcular totais baseados nos lançamentos filtrados
  const calcularTotais = () => {
    const agendados = lancamentos.filter(l => l.status?.toLowerCase() === 'agendado');
    const recebidos = lancamentos.filter(l => l.status?.toLowerCase() === 'recebido');
    
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

  // Função para ordenar lançamentos: Recebidos sempre no final
  const ordenarLancamentos = (lancamentos) => {
    const agendados = lancamentos.filter(l => l.status?.toLowerCase() !== 'recebido');
    const recebidos = lancamentos.filter(l => l.status?.toLowerCase() === 'recebido');
    
    // Ordenar cada grupo pela data conforme o filtro selecionado
    const ordenarPorData = (items) => {
      return items.sort((a, b) => {
        const dataA = new Date(a.data_pagamento + 'T00:00:00');
        const dataB = new Date(b.data_pagamento + 'T00:00:00');
        
        if (filtros.ordenacaoDias === 'asc') {
          return dataA - dataB; // A-Z (mais antigos primeiro)
        } else {
          return dataB - dataA; // Z-A (mais recentes primeiro)
        }
      });
    };
    
    return [
      ...ordenarPorData(agendados),
      ...ordenarPorData(recebidos)
    ];
  };

  const totais = calcularTotais();

  // Função para alterar status do lançamento
  const alterarStatus = async (id, novoStatus) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('cartao_lancamentos')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Recarregar lista
      await fetchLancamentos();
    } catch (err) {
      setError(`Erro ao alterar status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para editar lançamento
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

  // Função para salvar edição
  const salvarEdicao = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('cartao_lancamentos')
        .update({
          estabelecimento: editandoLancamento.estabelecimento,
          bandeira: editandoLancamento.bandeira,
          valor_liquido: parseFloat(editandoLancamento.valor_liquido),
          data_pagamento: editandoLancamento.data_pagamento,
          status: editandoLancamento.status
        })
        .eq('id', editandoLancamento.id);

      if (error) throw error;
      
      setShowEditModal(false);
      setEditandoLancamento(null);
      await fetchLancamentos();
    } catch (err) {
      setError(`Erro ao editar lançamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && lancamentos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Lançamentos</h1>
              <p className="text-gray-300">Gerencie todos os seus recebíveis de cartão</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Novo Lançamento
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="Agendado">Agendado</option>
                <option value="Recebido">Recebido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ordenar Dias p/ Receber
              </label>
              <select
                value={filtros.ordenacaoDias}
                onChange={(e) => setFiltros({...filtros, ordenacaoDias: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asc">Menor para Maior (A-Z)</option>
                <option value="desc">Maior para Menor (Z-A)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={aplicarFiltros}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={limparFiltros}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors shadow-lg"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">Total de Lançamentos</p>
              <p className="text-2xl font-bold text-white">{totais.total.quantidade}</p>
              <p className="text-lg font-semibold text-blue-400">{formatarValor(totais.total.valor)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400">Agendados</p>
              <p className="text-2xl font-bold text-yellow-400">{totais.agendados.quantidade}</p>
              <p className="text-lg font-semibold text-yellow-400">{formatarValor(totais.agendados.valor)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400">Recebidos</p>
              <p className="text-2xl font-bold text-green-400">{totais.recebidos.quantidade}</p>
              <p className="text-lg font-semibold text-green-400">{formatarValor(totais.recebidos.valor)}</p>
            </div>

          </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
          {error && (
            <div className="bg-red-900 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-200">
                    Erro ao carregar dados: {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Data Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Dias p/ Receber</span>
                      <button
                        onClick={() => {
                          const novaOrdenacao = filtros.ordenacaoDias === 'asc' ? 'desc' : 'asc';
                          setFiltros({...filtros, ordenacaoDias: novaOrdenacao});
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title={filtros.ordenacaoDias === 'asc' ? 'Ordenar Z-A' : 'Ordenar A-Z'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {filtros.ordenacaoDias === 'asc' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estabelecimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Bandeira
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Valor Líquido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-600">
                {lancamentos.map((lancamento, index) => {
                  // Verificar se é o primeiro item "Recebido" para adicionar separador
                  const isFirstRecebido = lancamento.status?.toLowerCase() === 'recebido' && 
                    (index === 0 || lancamentos[index - 1].status?.toLowerCase() !== 'recebido');
                  
                  return (
                    <React.Fragment key={lancamento.id}>
                      {isFirstRecebido && lancamentos.some(l => l.status?.toLowerCase() !== 'recebido') && (
                        <tr className="bg-gray-600">
                          <td colSpan="7" className="px-6 py-2 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="flex-1 h-px bg-gray-500"></div>
                              <span className="text-gray-300 text-sm font-medium">Lançamentos Recebidos</span>
                              <div className="flex-1 h-px bg-gray-500"></div>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className={`hover:bg-gray-700 transition-colors ${
                        lancamento.status?.toLowerCase() === 'recebido' ? 'bg-gray-750 opacity-75' : ''
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                          {formatarData(lancamento.data_pagamento)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-400">
                          {(() => {
                            const diasCalculados = calcularDiasParaReceber(lancamento.data_pagamento);
                            if (lancamento.status?.toLowerCase() === 'recebido') {
                              return <span className="text-green-400">✓ Recebido</span>;
                            } else if (diasCalculados < 0) {
                              return <span className="text-red-400">{Math.abs(diasCalculados)} dias em atraso</span>;
                            } else if (diasCalculados === 0) {
                              return <span className="text-green-400">Hoje</span>;
                            } else {
                              return `${diasCalculados} dias`;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                          {lancamento.estabelecimento || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                          {lancamento.bandeira || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                          {formatarValor(lancamento.valor_liquido)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lancamento.status)}`}>
                            {lancamento.status || 'Agendado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <div className="flex space-x-2">
                            {/* Botão para alterar status */}
                            {lancamento.status?.toLowerCase() === 'agendado' ? (
                              <button 
                                onClick={() => alterarStatus(lancamento.id, 'Recebido')}
                                className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="Marcar como Recebido"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Receber
                              </button>
                            ) : (
                              <button 
                                onClick={() => alterarStatus(lancamento.id, 'Agendado')}
                                className="flex items-center px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                                title="Marcar como Agendado"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Agendar
                              </button>
                            )}
                            
                            {/* Botão de Editar */}
                            <button 
                              onClick={() => abrirEdicao(lancamento)}
                              className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              title="Editar Lançamento"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lancamentos.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-200">Nenhum lançamento encontrado</h3>
              <p className="mt-1 text-sm text-gray-400">
                {error ? 'Verifique sua conexão e tente novamente.' : 'Comece criando um novo lançamento.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Novo Lançamento */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-600 max-h-screen overflow-y-auto">
              <div className="p-6">
                {/* Header do Modal */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Novo Lançamento</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Estabelecimento *
                    </label>
                    <input
                      type="text"
                      value={novoLancamento.estabelecimento}
                      onChange={(e) => setNovoLancamento({...novoLancamento, estabelecimento: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome do estabelecimento"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Bandeira *
                    </label>
                    <select
                      value={novoLancamento.bandeira}
                      onChange={(e) => setNovoLancamento({...novoLancamento, bandeira: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione a bandeira</option>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="Elo">Elo</option>
                      <option value="American Express">American Express</option>
                      <option value="Hipercard">Hipercard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Valor Bruto *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoLancamento.valor_bruto}
                      onChange={(e) => setNovoLancamento({...novoLancamento, valor_bruto: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Tipo de Pagamento *
                    </label>
                    <select
                      value={novoLancamento.tipo_pagamento}
                      onChange={(e) => setNovoLancamento({...novoLancamento, tipo_pagamento: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="credito_vista">Crédito à Vista</option>
                      <option value="credito_parcelado">Crédito Parcelado</option>
                    </select>
                  </div>

                  {novoLancamento.tipo_pagamento === 'credito_parcelado' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Quantidade de Parcelas *
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={novoLancamento.parcelas}
                        onChange={(e) => setNovoLancamento({...novoLancamento, parcelas: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Status *
                    </label>
                    <select
                      value={novoLancamento.status}
                      onChange={(e) => setNovoLancamento({...novoLancamento, status: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="Agendado">Agendado</option>
                      <option value="Recebido">Recebido</option>
                    </select>
                  </div>
                </div>

                {/* Preview dos Cálculos */}
                {novoLancamento.valor_bruto && novoLancamento.tipo_pagamento && (
                  <div className="bg-gray-700 rounded-lg p-4 mb-6 border border-gray-600">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Preview dos Cálculos</h3>
                    {novoLancamento.tipo_pagamento === 'credito_vista' ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Valor Bruto:</span>
                          <span className="text-white">{formatarValor(novoLancamento.valor_bruto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Taxa (4,49%):</span>
                          <span className="text-red-400">-{formatarValor(novoLancamento.valor_bruto * 0.0449)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-600 pt-2">
                          <span className="text-gray-300 font-medium">Valor Líquido:</span>
                          <span className="text-green-400 font-medium">
                            {formatarValor(calcularValorLiquido(novoLancamento.valor_bruto, 'credito_vista'))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Recebimento:</span>
                          <span className="text-blue-400">{(() => {
                            const dataRecebimento = new Date();
                            dataRecebimento.setDate(dataRecebimento.getDate() + 30);
                            return formatarData(dataRecebimento.toISOString().split('T')[0]);
                          })()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Valor Total Bruto:</span>
                          <span className="text-white">{formatarValor(novoLancamento.valor_bruto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Parcelas:</span>
                          <span className="text-white">{novoLancamento.parcelas}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Valor por Parcela (Bruto):</span>
                          <span className="text-white">{formatarValor(novoLancamento.valor_bruto / novoLancamento.parcelas)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Taxa por Parcela (4,49%):</span>
                          <span className="text-red-400">-{formatarValor((novoLancamento.valor_bruto / novoLancamento.parcelas) * 0.0449)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-600 pt-2">
                          <span className="text-gray-300 font-medium">Valor Líquido por Parcela:</span>
                          <span className="text-green-400 font-medium">
                            {formatarValor(calcularValorLiquido(novoLancamento.valor_bruto, 'credito_parcelado', novoLancamento.parcelas))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Recebimento:</span>
                          <span className="text-blue-400">{(() => {
                            const datas = [];
                            for (let i = 1; i <= Math.min(novoLancamento.parcelas, 3); i++) {
                              const dataRecebimento = new Date();
                              dataRecebimento.setDate(dataRecebimento.getDate() + (30 * i));
                              datas.push(formatarData(dataRecebimento.toISOString().split('T')[0]));
                            }
                            return datas.join(', ') + (novoLancamento.parcelas > 3 ? '...' : '');
                          })()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}



                {/* Botões */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={criarLancamentos}
                    disabled={!novoLancamento.estabelecimento || !novoLancamento.bandeira || !novoLancamento.valor_bruto || !novoLancamento.tipo_pagamento || !novoLancamento.status}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    Criar Lançamento(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Lançamento */}
        {showEditModal && editandoLancamento && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-600 max-h-screen overflow-y-auto">
              <div className="p-6">
                {/* Header do Modal */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Editar Lançamento</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditandoLancamento(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Formulário de Edição */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Estabelecimento *
                    </label>
                    <input
                      type="text"
                      value={editandoLancamento.estabelecimento}
                      onChange={(e) => setEditandoLancamento({...editandoLancamento, estabelecimento: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Bandeira *
                    </label>
                    <input
                      type="text"
                      value={editandoLancamento.bandeira}
                      onChange={(e) => setEditandoLancamento({...editandoLancamento, bandeira: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Valor Líquido *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editandoLancamento.valor_liquido}
                      onChange={(e) => setEditandoLancamento({...editandoLancamento, valor_liquido: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Data de Pagamento *
                    </label>
                    <input
                      type="date"
                      value={editandoLancamento.data_pagamento}
                      onChange={(e) => setEditandoLancamento({...editandoLancamento, data_pagamento: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Status *
                    </label>
                    <select
                      value={editandoLancamento.status}
                      onChange={(e) => setEditandoLancamento({...editandoLancamento, status: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="Agendado">Agendado</option>
                      <option value="Recebido">Recebido</option>
                    </select>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditandoLancamento(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarEdicao}
                    disabled={!editandoLancamento.estabelecimento || !editandoLancamento.bandeira || !editandoLancamento.valor_liquido || !editandoLancamento.data_pagamento || !editandoLancamento.status}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && lancamentos.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3 border border-gray-600 shadow-2xl">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="text-gray-200">Carregando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartaoGerenciamento;
