"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export type LocalMapa = {
  id: number;
  nome: string;
  tipo: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  capacidade: number | null;
  site: string | null;
  lat: number | null;
  lng: number | null;
};

const COR_TIPO: Record<string, string> = {
  "Espaço de Eventos": "#0087ff",
  Hotel: "#9033c1",
  Teatro: "#ed2945",
  Auditório: "#42b649",
  Restaurante: "#f59e0b",
  Cinema: "#64748b",
};

export default function LocaisMapa({ locais }: { locais: LocalMapa[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [pronto, setPronto] = useState(false);

  // inicializa o mapa uma vez
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !ref.current || mapRef.current) return;
      const map = L.map(ref.current).setView([-22.9, -46.5], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setPronto(true);
    })();
    return () => {
      cancelado = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // atualiza os marcadores quando a lista muda
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado) return;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();
      const comCoord = locais.filter((l) => l.lat != null && l.lng != null);
      const pontos: [number, number][] = [];
      for (const l of comCoord) {
        const cor = COR_TIPO[l.tipo ?? ""] ?? "#64748b";
        const raio = l.capacidade
          ? Math.min(14, 5 + Math.round(Math.sqrt(l.capacidade) / 6))
          : 6;
        const m = L.circleMarker([l.lat!, l.lng!], {
          radius: raio,
          color: cor,
          weight: 1.5,
          fillColor: cor,
          fillOpacity: 0.6,
        });
        const cap = l.capacidade ? `<br>Capacidade: <b>${l.capacidade.toLocaleString("pt-BR")}</b>` : "";
        const site = l.site
          ? `<br><a href="${l.site.startsWith("http") ? l.site : "https://" + l.site}" target="_blank" rel="noopener">site</a>`
          : "";
        m.bindPopup(
          `<b>${l.nome}</b><br>${[l.tipo, [l.bairro, l.cidade, l.uf].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}${cap}${site}`
        );
        m.addTo(layer);
        pontos.push([l.lat!, l.lng!]);
      }
      if (pontos.length) {
        map.fitBounds(pontos, { padding: [30, 30], maxZoom: 14 });
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [locais, pronto]);

  const semCoord = locais.filter((l) => l.lat == null || l.lng == null).length;

  return (
    <div>
      <div
        ref={ref}
        className="h-[70vh] w-full overflow-hidden rounded-xl border border-slate-200"
      />
      <p className="mt-2 text-xs text-slate-500">
        {locais.length - semCoord} de {locais.length} espaços no mapa
        {semCoord > 0 && ` · ${semCoord} ainda sem coordenada`}. Cores por tipo; o
        tamanho do ponto reflete a capacidade.
      </p>
    </div>
  );
}
