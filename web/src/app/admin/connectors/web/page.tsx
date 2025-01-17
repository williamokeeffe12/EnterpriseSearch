"use client";

import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";

import { LoadingAnimation } from "@/components/Loading";
import {
  GlobeIcon,
  GearIcon,
  ArrowSquareOutIcon,
} from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import {
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus, WebConfig } from "@/lib/types";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { createCredential, linkCredential } from "@/lib/credential";

const SCRAPE_TYPE_TO_PRETTY_NAME = {
  recursive: "Recursive",
  single: "Single Page",
  sitemap: "Sitemap",
};

export default function Web() {
  const { mutate } = useSWRConfig();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );

  const webIndexingStatuses: ConnectorIndexingStatus<WebConfig, {}>[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "web"
    ) ?? [];

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <GlobeIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Web</h1>
      </div>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Specify which websites to index
      </h2>
      <p className="text-sm mb-2">
        We re-fetch the latest state of the website once a day.
      </p>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <ConnectorForm<WebConfig>
          nameBuilder={(values) => `WebConnector-${values.base_url}`}
          ccPairNameBuilder={(values) => values.base_url}
          // Since there is no "real" credential associated with a web connector
          // we create a dummy one here so that we can associate the CC Pair with a
          // user. This is needed since the user for a CC Pair is found via the credential
          // associated with it.
          shouldCreateEmptyCredentialForConnector={true}
          source="web"
          inputType="load_state"
          formBody={
            <>
              <TextFormField name="base_url" label="URL to Index:" />
              <SelectorFormField
                name="web_connector_type"
                label="Scrape Method:"
                options={[
                  {
                    name: "Recursive",
                    value: "recursive",
                    description:
                      "Recursively index all pages that share the same base URL.",
                  },
                  {
                    name: "Single Page",
                    value: "single",
                    description: "Index only the specified page.",
                  },
                  {
                    name: "Sitemap",
                    value: "sitemap",
                    description:
                      "Assumes the URL to Index points to a Sitemap. Will try and index all pages that are a mentioned in the sitemap.",
                  },
                ]}
              />
            </>
          }
          validationSchema={Yup.object().shape({
            base_url: Yup.string().required(
              "Please enter the website URL to scrape e.g. https://docs.danswer.dev/"
            ),
            web_connector_type: Yup.string()
              .oneOf(["recursive", "single", "sitemap"])
              .optional(),
          })}
          initialValues={{
            base_url: "",
            web_connector_type: undefined,
          }}
          refreshFreq={60 * 60 * 24} // 1 day
        />
      </div>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Already Indexed Websites
      </h2>
      {isConnectorIndexingStatusesLoading ? (
        <LoadingAnimation text="Loading" />
      ) : isConnectorIndexingStatusesError || !connectorIndexingStatuses ? (
        <div>Error loading indexing history</div>
      ) : webIndexingStatuses.length > 0 ? (
        <ConnectorsTable<WebConfig, {}>
          connectorIndexingStatuses={webIndexingStatuses}
          specialColumns={[
            {
              header: "Base URL",
              key: "base_url",
              getValue: (
                ccPairStatus: ConnectorIndexingStatus<WebConfig, any>
              ) => {
                const connectorConfig =
                  ccPairStatus.connector.connector_specific_config;
                return (
                  <div className="flex w-fit">
                    <a
                      className="text-blue-500 ml-1 my-auto flex"
                      href={connectorConfig.base_url}
                    >
                      {connectorConfig.base_url}
                      <ArrowSquareOutIcon className="my-auto flex flex-shrink-0 text-blue-500" />
                    </a>
                    <a
                      className="my-auto"
                      href={`/admin/connector/${ccPairStatus.cc_pair_id}`}
                    >
                      <GearIcon className="ml-2 my-auto flex flex-shrink-0 text-gray-400" />
                    </a>
                  </div>
                );
              },
            },
            {
              header: "Scrape Method",
              key: "web_connector_type",
              getValue: (ccPairStatus) => {
                const connectorConfig =
                  ccPairStatus.connector.connector_specific_config;
                return connectorConfig.web_connector_type
                  ? SCRAPE_TYPE_TO_PRETTY_NAME[
                      connectorConfig.web_connector_type
                    ]
                  : "Recursive";
              },
            },
          ]}
          onUpdate={() => mutate("/api/manage/admin/connector/indexing-status")}
        />
      ) : (
        <p className="text-sm">No indexed websites found</p>
      )}
    </div>
  );
}
