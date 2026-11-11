import {
  CalendarIcon,
  HeartHandshakeIcon,
  ImageOffIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
  PhoneIcon,
  StoreIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Role } from '@/features/auth/auth-context';
import { counterpartOf } from '@/features/orders/order-contact';
import { OrderStatusBadge } from '@/features/orders/order-status-badge';
import type { OrderDetail, OrderInstitution } from '@/features/orders/orders-api';
import { formatDate, formatLocalDate, formatQuantity } from '@/lib/format';
import { whatsappUrl } from '@/lib/whatsapp';

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/50 flex items-center gap-3 rounded-md p-3">
      <Icon className="text-primary size-5 shrink-0" />
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-foreground text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}

export function OrderFoodCard({ food }: { food: OrderDetail['food'] }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="border-border bg-card flex flex-col overflow-hidden rounded-lg border sm:flex-row">
      <div className="bg-muted flex h-48 w-full shrink-0 items-center justify-center sm:h-auto sm:min-h-64 sm:w-64">
        {food.image && !imageFailed ? (
          <img
            src={food.image}
            alt={food.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ImageOffIcon className="text-muted-foreground size-10" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-xs font-medium">Alimento</h2>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-foreground text-lg font-semibold">{food.name}</p>
            <Badge variant="secondary" className="rounded-full">
              {food.category.name}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{food.description}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem
            icon={PackageIcon}
            label="Disponível agora"
            value={`${formatQuantity(food.quantity)} ${food.quantityUnit}`}
          />
          <InfoItem icon={CalendarIcon} label="Validade" value={formatDate(food.expirationDate)} />
        </div>
      </div>
    </section>
  );
}

export function OrderSummaryCard({ order }: { order: OrderDetail }) {
  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
      <h2 className="text-foreground text-lg font-semibold">Resumo do pedido</h2>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">Quantidade solicitada</span>
        <span className="text-foreground text-3xl font-bold tabular-nums">
          {formatQuantity(order.quantity)}{' '}
          <span className="text-muted-foreground text-base font-medium">
            {order.food.quantityUnit}
          </span>
        </span>
        {order.quantityUpdatedAt && (
          <span className="text-muted-foreground text-xs">
            Quantidade atualizada pelo estabelecimento em {formatLocalDate(order.quantityUpdatedAt)}
          </span>
        )}
      </div>
      <dl className="border-border flex flex-col gap-3 border-t pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Data do pedido</dt>
          <dd className="text-foreground font-medium">{formatLocalDate(order.orderDate)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <OrderStatusBadge status={order.status.name} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function CounterpartCard({ order, role }: { order: OrderDetail; role: Role | null }) {
  const isEstablishmentView = role === 'establishment';
  const institution: OrderInstitution = isEstablishmentView
    ? order.beneficiaryEntity
    : order.establishment;
  const title = isEstablishmentView
    ? 'Entidade beneficiária solicitante'
    : 'Estabelecimento doador';
  const Icon = isEstablishmentView ? HeartHandshakeIcon : StoreIcon;

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-3.5">
        <div className="bg-primary flex size-12 shrink-0 items-center justify-center rounded-full">
          <Icon className="text-primary-foreground size-5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground text-sm font-semibold">{institution.companyName}</span>
          {institution.tradeName && (
            <span className="text-muted-foreground text-xs">
              Nome fantasia: {institution.tradeName}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {institution.city}, {institution.state}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{institution.description}</p>
    </section>
  );
}

export function CounterpartContactCard({ order, role }: { order: OrderDetail; role: Role | null }) {
  const { institutionalEmail, institutionalPhone, address } = counterpartOf(order, role);
  if (!institutionalEmail || !institutionalPhone || !address) return null;

  const whatsapp = whatsappUrl(institutionalPhone);
  const street = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}`;

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">Contato para a retirada</h2>
        <p className="text-muted-foreground text-xs">
          Combinem a retirada diretamente. Estes dados aparecem só enquanto o pedido está em
          andamento.
        </p>
      </div>
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex items-start gap-3">
          <MailIcon className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <dt className="text-muted-foreground text-xs">E-mail</dt>
            <dd className="text-foreground font-medium break-words">
              <a href={`mailto:${institutionalEmail}`} className="hover:underline">
                {institutionalEmail}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <PhoneIcon className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <dt className="text-muted-foreground text-xs">Celular</dt>
            <dd className="text-foreground font-medium">{institutionalPhone}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPinIcon className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <dt className="text-muted-foreground text-xs">Endereço</dt>
            <dd className="text-foreground font-medium">
              {street}
              <br />
              {address.city}, {address.state} - CEP {address.postalCode}
            </dd>
          </div>
        </div>
      </dl>
      {whatsapp && (
        <Button asChild variant="outline" className="w-full">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircleIcon />
            Conversar no WhatsApp
          </a>
        </Button>
      )}
    </section>
  );
}
