import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { InstitutionRole } from '@/features/auth/auth-context';
import { DeleteAccountDialog } from '@/features/profile/delete-account-dialog';

// RF04/RF05: own account deletion, at the end of the profile page.
export function DangerZone({ role }: { role: InstitutionRole }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de perigo</CardTitle>
        <CardDescription>
          Ao excluir a conta, você perde o acesso ao Food Share e sua instituição deixa de aparecer
          para as outras. Os pedidos já concluídos continuam no histórico da outra parte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          <Trash2Icon />
          Excluir conta
        </Button>
      </CardContent>
      <DeleteAccountDialog role={role} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
