
import { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users, Building2, Plus, Trash2, Building, Plane, AlertTriangle,
  Edit2, UserPlus, Filter, History
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import clientesApi from "@/api/clientes";
import departamentosApi from "@/api/departamentos";
import viagensApi from "@/api/viagens";
import usuarioDepartamentoApi from "@/api/usuarioDepartamento";
import auditApi from "@/api/departamentoAudit";
import { listAllProfiles, updateProfileRole } from "@/api/profiles";
import { useAuth } from '@/lib/AuthContext';

const ROLES = [
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [viagens, setViagens] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usuarioDepartamento, setUsuarioDepartamento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [removingDep, setRemovingDep] = useState(null);
  const [updatingViagem, setUpdatingViagem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viagemToDelete, setViagemToDelete] = useState(null);
  const [deletingViagem, setDeletingViagem] = useState(false);
  
  // State for department and client management
  const [novoDepartamento, setNovoDepartamento] = useState({ nome: '', descricao: '', gestor_id: '' });
  const [novoCliente, setNovoCliente] = useState({ nome: '', cnpj: '', cidade: '', uf: '' });
  const [editDepartamento, setEditDepartamento] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterNome, setFilterNome] = useState('');
  const [filterGestor, setFilterGestor] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDepartamentoForAssign, setSelectedDepartamentoForAssign] = useState(null);
  
  // Confirmation for deleting departments with users
  const [depDeleteDialogOpen, setDepDeleteDialogOpen] = useState(false);
  const [depToDelete, setDepToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load core data first
      const [clts, users, viags] = await Promise.all([
        clientesApi.list({ orderBy: "-created_at" }).catch(e => { console.warn(e); return []; }),
        listAllProfiles().catch(e => { console.warn(e); return []; }),
        viagensApi.list({ orderBy: "-created_at" }).catch(e => { console.warn(e); return []; }),
      ]);
      
      // Load optional data (might fail if tables don't exist)
      let deps = [];
      let logs = [];
      let ud = [];
      
      try {
        deps = await departamentosApi.listWithGestor({ orderBy: "nome" });
      } catch (e) {
        console.warn("Departamentos not available yet:", e);
      }
      
      try {
        logs = await auditApi.getLogs(50);
      } catch (e) {
        console.warn("Audit logs not available yet:", e);
      }
      
      try {
        ud = await usuarioDepartamentoApi.listAll();
      } catch (e) {
        console.warn("Usuario departamento not available yet:", e);
      }
      
      setClientes(clts || []);
      setUsuarios(users || []);
      setViagens(viags || []);
      setDepartamentos(deps || []);
      setAuditLogs(logs || []);
      setUsuarioDepartamento(ud || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados');
      // Set defaults in case of total failure
      setClientes([]);
      setUsuarios([]);
      setViagens([]);
      setDepartamentos([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter to get only colaboradores
  const colaboradores = usuarios.filter(u => u.role === 'colaborador');
  
  // Filter departments
  const filteredDepartamentos = departamentos.filter(d => {
    if (!d) return false;
    const matchesNome = (d.nome || '').toLowerCase().includes(filterNome.toLowerCase());
    const matchesGestor = !filterGestor || d.gestor_id === filterGestor;
    return matchesNome && matchesGestor;
  });

  const handleAssignViagem = async (viagemId, newSolicitanteId) => {
    setUpdatingViagem(viagemId);
    try {
      const selectedUser = usuarios.find(u => u.id === newSolicitanteId);
      await viagensApi.update(viagemId, {
        solicitante_id: newSolicitanteId,
        solicitante_nome: selectedUser?.nome || '',
      });
      await loadData();
      toast.success('Viagem atribuída com sucesso');
    } catch (error) {
      toast.error('Erro ao atribuir viagem');
      console.error(error);
    } finally {
      setUpdatingViagem(null);
    }
  };

  const handleDeleteViagem = (viagem) => {
    setViagemToDelete(viagem);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteViagem = async () => {
    if (!viagemToDelete) return;
    setDeletingViagem(true);
    try {
      await viagensApi.remove(viagemToDelete.id);
      toast.success('Viagem excluída com sucesso');
      setDeleteDialogOpen(false);
      setViagemToDelete(null);
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir viagem');
      console.error(error);
    } finally {
      setDeletingViagem(false);
    }
  };

  const addCliente = async () => {
    if (!novoCliente.nome) return;
    await clientesApi.create(novoCliente);
    setNovoCliente({ nome: '', cnpj: '', cidade: '', uf: '' });
    await loadData();
    toast.success('Cliente cadastrado');
  };

  const removeCliente = async (id) => {
    await clientesApi.remove(id);
    await loadData();
    toast.success('Cliente removido');
  };

  // Department management functions
  const addDepartamento = async () => {
    if (!novoDepartamento.nome) return;
    try {
      const newDep = await departamentosApi.create(novoDepartamento);
      
      // Log the action (non-blocking)
      auditApi.logAction({
        action: 'CREATE',
        entityType: 'DEPARTMENT',
        entityId: newDep.id,
        newValues: novoDepartamento,
        performedBy: user.id,
        userAgent: navigator.userAgent
      }).catch(e => console.warn("Audit log failed:", e));
      
      setNovoDepartamento({ nome: '', descricao: '', gestor_id: '' });
      await loadData();
      toast.success('Departamento cadastrado com sucesso');
    } catch (error) {
      if (error.message?.includes('duplicate key')) {
        toast.error('Nome de departamento já existe');
      } else {
        toast.error('Erro ao cadastrar departamento');
      }
      console.error(error);
    }
  };

  const openEditDepartamento = (dep) => {
    setEditDepartamento({ ...dep });
    setEditDialogOpen(true);
  };

  const saveEditDepartamento = async () => {
    if (!editDepartamento) return;
    try {
      const oldValues = departamentos.find(d => d.id === editDepartamento.id);
      
      await departamentosApi.update(editDepartamento.id, editDepartamento);
      
      // Log the action (non-blocking)
      auditApi.logAction({
        action: 'UPDATE',
        entityType: 'DEPARTMENT',
        entityId: editDepartamento.id,
        oldValues: oldValues,
        newValues: editDepartamento,
        performedBy: user.id,
        userAgent: navigator.userAgent
      }).catch(e => console.warn("Audit log failed:", e));
      
      setEditDialogOpen(false);
      setEditDepartamento(null);
      await loadData();
      toast.success('Departamento atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar departamento');
      console.error(error);
    }
  };

  const confirmRemoveDepartamento = async () => {
    if (!depToDelete) return;
    setRemovingDep(depToDelete.id);
    
    try {
      // First check if there are users assigned using our local data
      const assignments = usuarioDepartamento.filter(ud => ud.departamento_id === depToDelete.id);
      
      if (assignments && assignments.length > 0) {
        toast.error('Não é possível excluir: há usuários atribuídos a este departamento');
        setRemovingDep(null);
        setDepDeleteDialogOpen(false);
        return;
      }

      // Log the action before deleting (non-blocking)
      auditApi.logAction({
        action: 'DELETE',
        entityType: 'DEPARTMENT',
        entityId: depToDelete.id,
        oldValues: depToDelete,
        performedBy: user.id,
        userAgent: navigator.userAgent
      }).catch(e => console.warn("Audit log failed:", e));

      await departamentosApi.remove(depToDelete.id);
      await loadData();
      toast.success('Departamento removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover departamento');
      console.error(error);
    } finally {
      setRemovingDep(null);
      setDepToDelete(null);
      setDepDeleteDialogOpen(false);
    }
  };

  const openAssignDialog = (dep) => {
    setSelectedDepartamentoForAssign(dep);
    setAssignDialogOpen(true);
  };

  const toggleUserAssignment = async (userId, isAssigned) => {
    if (!selectedDepartamentoForAssign) return;
    try {
      if (isAssigned) {
        await usuarioDepartamentoApi.unassignUsuario(selectedDepartamentoForAssign.id, userId);
        
        // Log the action (non-blocking)
        auditApi.logAction({
          action: 'UNASSIGN',
          entityType: 'ASSIGNMENT',
          entityId: null,
          oldValues: { departamento_id: selectedDepartamentoForAssign.id, usuario_id: userId },
          performedBy: user.id,
          userAgent: navigator.userAgent
        }).catch(e => console.warn("Audit log failed:", e));
        
        toast.success('Usuário desvinculado do departamento');
      } else {
        await usuarioDepartamentoApi.assignUsuario(
          selectedDepartamentoForAssign.id,
          userId,
          user.id
        );
        
        // Log the action (non-blocking)
        auditApi.logAction({
          action: 'ASSIGN',
          entityType: 'ASSIGNMENT',
          entityId: null,
          newValues: { departamento_id: selectedDepartamentoForAssign.id, usuario_id: userId },
          performedBy: user.id,
          userAgent: navigator.userAgent
        }).catch(e => console.warn("Audit log failed:", e));
        
        toast.success('Usuário vinculado ao departamento');
      }
      await loadData();
    } catch (error) {
      // Don't show error for duplicate key or missing assignment
      if (error?.code !== "23505") {
        toast.error('Erro ao atualizar atribuição');
        console.error(error);
      }
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      await updateProfileRole(userId, newRole);
      await loadData();
      toast.success('Role atualizada com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar role');
      console.error(error);
    } finally {
      setUpdatingRole(null);
    }
  };

  // Helper to get users assigned to a department
  const getAssignedUserIds = (depId) => {
    return usuarioDepartamento.filter(ud => ud.departamento_id === depId).map(ud => ud.usuario_id);
  };

  return (
    <div className="py-6 animate-fade-in max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administração</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, clientes, departamentos e configurações do sistema</p>
      </div>

      <Tabs defaultValue="departamentos">
        <TabsList className="bg-card border border-border p-1 rounded-xl flex-nowrap overflow-x-auto no-scrollbar gap-1 touch-pan-x max-w-full w-full">
          <TabsTrigger value="clientes" className="text-xs sm:text-sm gap-1.5 shrink-0 h-10">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="departamentos" className="text-xs sm:text-sm gap-1.5 shrink-0 h-10">
            <Building className="h-4 w-4 sm:h-5 sm:w-5" /> Departamentos
          </TabsTrigger>
          <TabsTrigger value="viagens" className="text-xs sm:text-sm gap-1.5 shrink-0 h-10">
            <Plane className="h-4 w-4 sm:h-5 sm:w-5" /> Viagens
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs sm:text-sm gap-1.5 shrink-0 h-10">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs sm:text-sm gap-1.5 shrink-0 h-10">
            <History className="h-4 w-4 sm:h-5 sm:w-5" /> Auditoria
          </TabsTrigger>
        </TabsList>

        {/* CLIENTES */}
        <TabsContent value="clientes" className="mt-4 space-y-4">
          {/* Novo cliente */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Novo Cliente</p>
              <div className="grid sm:grid-cols-4 gap-3 mb-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={novoCliente.nome}
                    onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Razão social"
                    className="bg-input border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CNPJ</Label>
                  <Input
                    value={novoCliente.cnpj}
                    onChange={e => setNovoCliente(p => ({ ...p, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    className="bg-input border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={novoCliente.cidade}
                    onChange={e => setNovoCliente(p => ({ ...p, cidade: e.target.value }))}
                    placeholder="Cidade"
                    className="bg-input border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UF</Label>
                  <Input
                    value={novoCliente.uf}
                    onChange={e => setNovoCliente(p => ({ ...p, uf: e.target.value }))}
                    placeholder="UF"
                    className="bg-input border-border text-sm w-16"
                  />
                </div>
              </div>
              <Button onClick={addCliente} size="sm" className="gradient-primary text-white gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Cadastrar Cliente
              </Button>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 bg-slate-700 rounded-xl" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {clientes.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.cnpj && `CNPJ: ${c.cnpj}`} {c.cidade && `• ${c.cidade}/${c.uf}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => removeCliente(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPARTAMENTOS */}
        <TabsContent value="departamentos" className="mt-4 space-y-4">
          {/* Filters */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Filtros</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={filterNome}
                    onChange={e => setFilterNome(e.target.value)}
                    placeholder="Buscar por nome"
                    className="bg-input border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gestor</Label>
                  <Select value={filterGestor} onValueChange={setFilterGestor}>
                    <SelectTrigger className="bg-input border-border text-sm">
                      <SelectValue placeholder="Todos os gestores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os gestores</SelectItem>
                      {usuarios.filter(u => ['gestor', 'admin'].includes(u.role)).map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Novo departamento */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Novo Departamento</p>
              <div className="grid sm:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={novoDepartamento.nome}
                    onChange={e => setNovoDepartamento(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome do departamento"
                    className="bg-input border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gestor Responsável</Label>
                  <Select 
                    value={novoDepartamento.gestor_id} 
                    onValueChange={(val) => setNovoDepartamento(p => ({ ...p, gestor_id: val }))}
                  >
                    <SelectTrigger className="bg-input border-border text-sm">
                      <SelectValue placeholder="Selecione um gestor" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.filter(u => ['gestor', 'admin'].includes(u.role)).map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={novoDepartamento.descricao}
                  onChange={e => setNovoDepartamento(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição do departamento"
                  className="bg-input border-border text-sm"
                  rows={2}
                />
              </div>
              <Button onClick={addDepartamento} size="sm" className="gradient-primary text-white gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Cadastrar Departamento
              </Button>
            </CardContent>
          </Card>

          {/* Lista de departamentos */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Departamentos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 bg-slate-700 rounded-xl" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredDepartamentos.map(d => (
                    <div key={d.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{d.nome}</p>
                        {d.descricao && (
                          <p className="text-xs text-muted-foreground mt-0.5">{d.descricao}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {d.gestor_id && (
                            <Badge variant="outline" className="text-xs">
                              Gestor: {usuarios.find(u => u.id === d.gestor_id)?.nome || "Desconhecido"}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {usuarioDepartamento.filter(ud => ud.departamento_id === d.id).length} usuários
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-blue-400"
                          onClick={() => openAssignDialog(d)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-yellow-400"
                          onClick={() => openEditDepartamento(d)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-400" 
                          onClick={() => {
                            setDepToDelete(d);
                            setDepDeleteDialogOpen(true);
                          }}
                          disabled={removingDep === d.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredDepartamentos.length === 0 && departamentos.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum departamento corresponde aos filtros</p>
                  )}
                  {departamentos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum departamento cadastrado</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VIAGENS */}
        <TabsContent value="viagens" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Gerenciar Viagens</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-slate-700 rounded-xl" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {viagens.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Plane className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{v.codigo_documento}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.cliente_nome} • {v.localidade}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {v.status}
                        </Badge>
                        <Select 
                          value={v.solicitante_id} 
                          onValueChange={(val) => handleAssignViagem(v.id, val)}
                          disabled={updatingViagem === v.id}
                        >
                          <SelectTrigger className="w-40 text-xs h-8">
                            <SelectValue placeholder="Atribuir..." />
                          </SelectTrigger>
                          <SelectContent>
                            {colaboradores.map(u => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => handleDeleteViagem(v)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {viagens.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma viagem cadastrada</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          {/* Lista de todos os usuários */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Usuários Cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-slate-700 rounded-xl" />)}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {usuarios.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.nome?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{u.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email}
                          {u.username && ` • @${u.username}`}
                        </p>
                      </div>
                      <Select 
                        value={u.role} 
                        onValueChange={(val) => handleChangeRole(u.id, val)}
                        disabled={updatingRole === u.id}
                      >
                        <SelectTrigger className="w-32 text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value} className="text-xs">
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {usuarios.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário cadastrado</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDITORIA */}
        <TabsContent value="auditoria" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Logs de Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12 bg-slate-700 rounded-xl" />)}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-accent/5">
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                          log.action === 'CREATE' ? 'bg-green-400' :
                          log.action === 'UPDATE' ? 'bg-yellow-400' :
                          log.action === 'DELETE' ? 'bg-red-400' :
                          log.action === 'ASSIGN' ? 'bg-blue-400' :
                          'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {log.action}
                            </Badge>
                            <span className="text-sm font-medium">{log.entity_type}</span>
                            {log.profiles && (
                              <span className="text-xs text-muted-foreground">
                                por {log.profiles.nome}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(log.performed_at).toLocaleString('pt-BR')}
                          </p>
                          {log.ip_address && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum log de auditoria encontrado</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Viagem Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os dados da viagem serão permanentemente removidos, incluindo:
            </AlertDialogDescription>
            {viagemToDelete && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-semibold text-foreground">Viagem a ser excluída:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {viagemToDelete.codigo_documento}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {viagemToDelete.cliente_nome} • {viagemToDelete.localidade}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingViagem}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteViagem();
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={deletingViagem}
            >
              {deletingViagem ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Departamento Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>
              Atualize as informações do departamento abaixo
            </DialogDescription>
          </DialogHeader>
          {editDepartamento && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={editDepartamento.nome}
                  onChange={(e) => setEditDepartamento({ ...editDepartamento, nome: e.target.value })}
                  placeholder="Nome do departamento"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gestor Responsável</Label>
                <Select 
                  value={editDepartamento.gestor_id} 
                  onValueChange={(val) => setEditDepartamento({ ...editDepartamento, gestor_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.filter(u => ['gestor', 'admin'].includes(u.role)).map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={editDepartamento.descricao || ''}
                  onChange={(e) => setEditDepartamento({ ...editDepartamento, descricao: e.target.value })}
                  placeholder="Descrição do departamento"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEditDepartamento} className="gradient-primary text-white">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departamento Delete Confirmation */}
      <AlertDialog open={depDeleteDialogOpen} onOpenChange={setDepDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O departamento será permanentemente removido.
            </AlertDialogDescription>
            {depToDelete && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-semibold text-foreground">Departamento a ser excluído:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {depToDelete.nome}
                </p>
                {(() => {
                  const count = usuarioDepartamento.filter(ud => ud.departamento_id === depToDelete.id).length;
                  return count > 0 && (
                    <p className="text-xs text-orange-400 mt-1">
                      ⚠️ Há {count} usuários atribuídos a este departamento
                    </p>
                  );
                })()}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingDep}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmRemoveDepartamento();
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={removingDep}
            >
              {removingDep ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Usuários</DialogTitle>
            <DialogDescription>
              Selecione os usuários que devem estar vinculados ao departamento {selectedDepartamentoForAssign?.nome}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {selectedDepartamentoForAssign && (
              <div className="space-y-2">
                {usuarios.map(u => {
                  const assignedIds = getAssignedUserIds(selectedDepartamentoForAssign.id);
                  const isAssigned = assignedIds.includes(u.id);
                  return (
                    <div 
                      key={u.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-border"
                    >
                      <Checkbox 
                        id={`user-${u.id}`}
                        checked={isAssigned}
                        onCheckedChange={(checked) => toggleUserAssignment(u.id, isAssigned)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`user-${u.id}`} className="text-sm font-medium">
                          {u.nome}
                        </Label>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{u.role}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setAssignDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
