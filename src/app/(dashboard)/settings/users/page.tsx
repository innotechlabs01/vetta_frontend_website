"use client";

import { useEffect, useState } from "react";
import { useEnvironment } from "@/context/EnvironmentContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Plus, User, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { CreateUserModal } from "./createuser";
import { EditUserModal } from "./edituser";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type MemberRow = {
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "member";
  name?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  email: string | null;
  phone?: string | null;
  location_ids: string[] | null;
  menu_access?: Array<{ label: string; path: string }>;
};

export default function UsersPage() {
  const { org } = useEnvironment();
  const orgId = org?.id;
  const isAdmin = useEnvironment().isAdmin;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [q, setQ] = useState("");
  const [openModal, setOpenModal] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<MemberRow | null>(null);
  const [editingUser, setEditingUser] = useState<MemberRow | null>(null);

  // Opcional: paginación
  const [page] = useState(1);
  const [pageSize] = useState(50);

  async function fetchData(signal?: AbortSignal) {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await fetch("/api/admin/org-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          q,
          page,
          pageSize,
          sortBy: "full_name",
          sortDir: "asc",
        }),
        signal,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Error cargando usuarios");
      }

      const { rows /*, count*/ } = await res.json();
      setRows(rows ?? []);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e?.message ?? "Error cargando usuarios");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!orgId) return;
    try {
      setDeletingId(userId);
      const res = await fetch("/api/admin/org-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo eliminar el usuario");
      }

      toast.success("Usuario eliminado");
      // Actualiza lista local sin refetch completo (opcional)
      setRows((prev) => prev.filter((r) => r.user_id !== userId));
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar el usuario");
    } finally {
      setDeletingId(null);
      setConfirmUser(null);
    }
  }

  // Carga inicial + cada vez que cambie orgId o q
  useEffect(() => {
    const ctrl = new AbortController();
    fetchData(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, q]);

  return (
    <div className="max-w-5xl mx-auto py-6 ">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo usuario
          </Button>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono"
          className="max-w-md"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sucursales</TableHead>
              <TableHead>Menús</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando usuarios...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay usuarios para mostrar.
                </TableCell>
              </TableRow>
            )}

            {rows.map((u) => {
              const isOwner = u.role === "owner";
              const isDeleting = deletingId === u.user_id;

              return (
                <TableRow key={u.user_id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
                          alt={u.full_name ?? "avatar"}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span>{u.full_name ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{u.email ?? "—"}</TableCell>
                  <TableCell>{u.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {["owner", "admin"].includes(u.role) ? (
                      <span className="text-xs text-muted-foreground">Todas</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {u.location_ids?.length ? `${u.location_ids.length} asignadas` : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.menu_access && u.menu_access.length > 0 ? (
                        <>
                          {u.menu_access.slice(0, 2).map((menu: any, idx: number) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {menu.label}
                            </span>
                          ))}
                          {u.menu_access.length > 2 && (
                            <span className="text-xs text-muted-foreground" title={u.menu_access.slice(2).map((m: any) => m.label).join(', ')}>
                              +{u.menu_access.length - 2} más
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
              <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Get current user's role */}
                      {(() => {
                        const { memberRole: currentUserRole } = useEnvironment();
                        const canEdit = currentUserRole === "owner" || (currentUserRole === "admin" && u.role !== "owner");
                        const canDelete = currentUserRole === "owner" || (currentUserRole === "admin" && u.role !== "owner");
                        
                        return (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingUser(u)}
                              disabled={!canEdit}
                              title={!canEdit ? "No tienes permisos para editar a este usuario" : "Editar usuario"}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog open={!!confirmUser && confirmUser.user_id === u.user_id} onOpenChange={(open) => !open && setConfirmUser(null)}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={!canDelete || isDeleting}
                                  onClick={() => setConfirmUser(u)}
                                  title={!canDelete ? "No tienes permisos para eliminar a este usuario" : "Eliminar usuario"}
                                >
                                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Seguro que deseas eliminar a <b>{u.full_name ?? u.email ?? "este usuario"}</b> de la organización?
                                    Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(u.user_id)}
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal Editar Usuario */}
      <EditUserModal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => {
          setEditingUser(null);
          fetchData();
        }}
        user={editingUser ? {
          user_id: editingUser.user_id,
          full_name: editingUser.full_name ?? null,
          phone: editingUser.phone ?? null,
          role: editingUser.role,
          location_ids: editingUser.location_ids,
        } : null}
      />

      {/* Modal Crear Usuario */}
      <CreateUserModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          fetchData();
        }}
      />
    </div>
  );
}