import { useState } from "react";
import { 
  useAdminListUsers, useAdminUpdateUser, 
  useAdminListInvites, useAdminCreateInvite, useAdminRevokeInvite,
  useListCategories, useAdminCreateCategory, useAdminUpdateCategory, useAdminDeleteCategory,
  useListStates, useAdminCreateState, useAdminUpdateState, useAdminDeleteState,
  useListLocations, useAdminUpdateLocation, useAdminDeleteLocation,
  useListThreads, useAdminPinThread, useAdminDeleteThread,
  getAdminListUsersQueryKey, getAdminListInvitesQueryKey, getListCategoriesQueryKey, getListStatesQueryKey, getListLocationsQueryKey, getListThreadsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, KeyRound, Map, MapPin, MessageSquare, Trash2, Edit2, Plus, Copy, Ban, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="font-serif text-3xl text-foreground tracking-widest uppercase">Admin Override</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">System Control Interface</p>
        </div>
      </div>

      <Tabs defaultValue="invites" className="w-full">
        <TabsList className="bg-card/40 border border-border/50 rounded-none h-auto flex flex-wrap p-1 gap-1">
          <TabsTrigger value="invites" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><KeyRound className="w-4 h-4 mr-2" /> Invites</TabsTrigger>
          <TabsTrigger value="users" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="w-4 h-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Map className="w-4 h-4 mr-2" /> Categories</TabsTrigger>
          <TabsTrigger value="states" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MapPin className="w-4 h-4 mr-2" /> States</TabsTrigger>
          <TabsTrigger value="threads" className="rounded-none font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MessageSquare className="w-4 h-4 mr-2" /> Threads</TabsTrigger>
        </TabsList>

        <div className="mt-6 border border-border/50 bg-card/20 p-6 backdrop-blur-sm min-h-[500px]">
          <TabsContent value="invites" className="m-0"><InvitesTab /></TabsContent>
          <TabsContent value="users" className="m-0"><UsersTab /></TabsContent>
          <TabsContent value="categories" className="m-0"><CategoriesTab /></TabsContent>
          <TabsContent value="states" className="m-0"><StatesTab /></TabsContent>
          <TabsContent value="threads" className="m-0"><ThreadsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function InvitesTab() {
  const { data, isLoading } = useAdminListInvites();
  const createInvite = useAdminCreateInvite();
  const revokeInvite = useAdminRevokeInvite();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState("");

  const handleCreate = () => {
    createInvite.mutate({ data: { note: note || null } }, {
      onSuccess: () => {
        setNote("");
        queryClient.invalidateQueries({ queryKey: getAdminListInvitesQueryKey() });
        toast({ title: "Invite created", description: "A new access code has been generated." });
      }
    });
  };

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied to clipboard", description: "Invite link ready to share." });
  };

  const handleRevoke = (id: number) => {
    if (!confirm("Revoke this invite?")) return;
    revokeInvite.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListInvitesQueryKey() });
        toast({ title: "Invite revoked" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1 max-w-sm">
          <label className="font-mono text-xs uppercase text-muted-foreground">Internal Note (Optional)</label>
          <Input value={note} onChange={e => setNote(e.target.value)} className="bg-background/50 rounded-none border-border font-mono" placeholder="Who is this for?" />
        </div>
        <Button onClick={handleCreate} disabled={createInvite.isPending} className="font-serif tracking-widest uppercase rounded-none shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Generate Key
        </Button>
      </div>

      <div className="border border-border/50 bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-mono text-xs uppercase">Code</TableHead>
              <TableHead className="font-mono text-xs uppercase">Note</TableHead>
              <TableHead className="font-mono text-xs uppercase">Created By</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
            ) : data?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 font-mono text-xs text-muted-foreground italic">No invites generated.</TableCell></TableRow>
            ) : data?.map(invite => (
              <TableRow key={invite.id} className="border-border/50 group">
                <TableCell className="font-mono text-primary">{invite.code}</TableCell>
                <TableCell className="font-mono text-sm">{invite.note || "-"}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{invite.createdByUsername}</TableCell>
                <TableCell>
                  {invite.usedById ? (
                    <Badge variant="outline" className="rounded-none border-destructive/30 text-destructive bg-destructive/10 text-[10px] uppercase font-mono">Used by {invite.usedByUsername}</Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-none border-green-500/30 text-green-500 bg-green-500/10 text-[10px] uppercase font-mono">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {!invite.usedById && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(invite.code)} className="h-8 w-8 rounded-none hover:bg-primary/20 hover:text-primary"><Copy className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRevoke(invite.id)} className="h-8 w-8 rounded-none hover:bg-destructive/20 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function UsersTab() {
  const { data, isLoading } = useAdminListUsers();
  const updateUser = useAdminUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleToggleRole = (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    updateUser.mutate({ id, data: { role: newRole as "admin" | "member" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: "Role updated" });
      }
    });
  };

  const handleToggleBan = (id: number, isBanned: boolean) => {
    if (!confirm(`Are you sure you want to ${isBanned ? 'unban' : 'ban'} this user?`)) return;
    updateUser.mutate({ id, data: { isBanned: !isBanned } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: "Ban status updated" });
      }
    });
  };

  return (
    <div className="border border-border/50 bg-background overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="font-mono text-xs uppercase">Operative</TableHead>
            <TableHead className="font-mono text-xs uppercase">Role</TableHead>
            <TableHead className="font-mono text-xs uppercase">Status</TableHead>
            <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
          ) : data?.map(user => (
            <TableRow key={user.id} className="border-border/50 group">
              <TableCell className="font-mono text-sm font-medium">{user.username}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`rounded-none text-[10px] uppercase font-mono px-2 py-0.5 ${user.role === 'admin' ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground'}`}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                {user.isBanned ? (
                  <Badge variant="outline" className="rounded-none border-destructive/50 text-destructive bg-destructive/10 text-[10px] uppercase font-mono">Banned</Badge>
                ) : (
                  <Badge variant="outline" className="rounded-none border-green-500/50 text-green-500 bg-green-500/10 text-[10px] uppercase font-mono">Active</Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleToggleRole(user.id, user.role)} title="Toggle Role" className="h-8 w-8 rounded-none hover:bg-accent/20 hover:text-accent">
                  <Shield className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleToggleBan(user.id, user.isBanned)} title={user.isBanned ? "Unban" : "Ban"} className={`h-8 w-8 rounded-none hover:bg-destructive/20 hover:text-destructive ${user.isBanned ? 'text-destructive' : ''}`}>
                  {user.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CategoriesTab() {
  const { data, isLoading } = useListCategories();
  // Simplified for demo - would need full CRUD UI
  return (
    <div className="border border-border/50 bg-background overflow-hidden p-6 text-center text-muted-foreground font-mono text-sm">
      Category Management Interface (To Be Implemented)
      <br /><br />
      {data?.map(c => <div key={c.id}>{c.name}</div>)}
    </div>
  );
}

function StatesTab() {
  const { data, isLoading } = useListStates();
  return (
    <div className="border border-border/50 bg-background overflow-hidden p-6 text-center text-muted-foreground font-mono text-sm">
      State/Sector Management Interface (To Be Implemented)
      <br /><br />
      {data?.map(s => <div key={s.id}>{s.name} ({s.abbreviation})</div>)}
    </div>
  );
}

function ThreadsTab() {
  const { data, isLoading } = useListThreads();
  const pinThread = useAdminPinThread();
  const deleteThread = useAdminDeleteThread();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleTogglePin = (id: number, isPinned: boolean) => {
    pinThread.mutate({ id, data: { isPinned: !isPinned } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
        toast({ title: isPinned ? "Thread unpinned" : "Thread pinned" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Permanently delete this thread and all its posts?")) return;
    deleteThread.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey() });
        toast({ title: "Thread deleted" });
      }
    });
  };

  return (
    <div className="border border-border/50 bg-background overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="font-mono text-xs uppercase">Transmission</TableHead>
            <TableHead className="font-mono text-xs uppercase">Author</TableHead>
            <TableHead className="font-mono text-xs uppercase">Status</TableHead>
            <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
          ) : data?.map(thread => (
            <TableRow key={thread.id} className="border-border/50 group">
              <TableCell className="font-mono text-sm font-medium">{thread.title}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{thread.authorUsername}</TableCell>
              <TableCell>
                {thread.isPinned && <Badge variant="outline" className="rounded-none border-primary/50 text-primary bg-primary/10 text-[10px] uppercase font-mono">Pinned</Badge>}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleTogglePin(thread.id, thread.isPinned)} className="rounded-none font-mono text-xs uppercase hover:text-primary">
                  {thread.isPinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(thread.id)} className="h-8 w-8 rounded-none hover:bg-destructive/20 hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
