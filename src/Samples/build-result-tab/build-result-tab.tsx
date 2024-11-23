import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

import "./build-result-tab.scss";

import { Header } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";

import { showRootComponent } from "../../Common";
import {CommonServiceIds, getClient, IExtensionDataService, IProjectPageService} from "azure-devops-extension-api";
import {IExtensionDataManager} from "azure-devops-extension-api/Common/CommonServices";
import {ServiceEndpointRestClient} from "azure-devops-extension-api/ServiceEndpoint";

interface IBuildResultTab {
    projectContext: any;
    tokenInput: string | undefined;
}

class BuildResultTab extends React.Component<{}, IBuildResultTab> {
    private _dataManager: IExtensionDataManager | null = null;

    constructor(props: {}) {
        super(props);
        this.state = { projectContext: undefined, tokenInput: undefined };
    }

    private async sdkReadiness() {
        await SDK.ready();

        if (!this._dataManager) {
            const accessToken = await SDK.getAccessToken();
            const extDataService = await SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService);
            this._dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
        }
    }

    public componentDidMount() {
        try {        
            console.log("Component did mount, initializing SDK...");
            SDK.init();
            
            SDK.ready().then(() => {
                console.log("SDK is ready, loading project context...");
                this.loadProjectContext();
            }).catch((error) => {
                console.error("SDK ready failed: ", error);
            });
        } catch (error) {
            console.error("Error during SDK initialization or project context loading: ", error);
        }
    }

    public async applyToken() {
        await this.sdkReadiness();

        console.log('Trying to set the token');
        await this._dataManager?.setValue("token", this.state.tokenInput, { scopeType: ""});
    }

    public async getToken() {
        await this.sdkReadiness();

        const token = await this._dataManager?.getValue<string>("token");
        console.log('Token: ', token);
    }

    public async getServiceConnections() {
        await this.sdkReadiness();

        const serviceEndpointClient = getClient(ServiceEndpointRestClient);
        console.log('ServiceEndpointClient:', serviceEndpointClient);
        const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        console.log('ProjectService:', projectService);
        const project = await projectService.getProject();
        console.log('Project:', project);

        if (!project) {
            console.error("No project context found");
            return;
        }

        try {
            const serviceConnections = await serviceEndpointClient.getServiceEndpoints(project.id);
            console.log('SERVICE CONNECTIONS:', serviceConnections);
            const serviceConnection = await serviceEndpointClient.getServiceEndpointDetails(project.id, serviceConnections[0].id);
            console.log('SINGLE SERVICE CONNECTION:', serviceConnection);
        } catch (error) {
            console.error(`Error fetching service connections: ${error.message}`);
        }
    }

    public render(): JSX.Element {
        return (
            <Page className="sample-hub flex-grow">
                <Header title="Custom Build Hub" />
                <div className="page-content">
                    <div className="webcontext-section">
                        <h2>Project Context:</h2>
                        <pre>{JSON.stringify(this.state.projectContext, null, 2)}</pre>
                    </div>
                    <div className="webcontext-section">
                        Some data
                    </div>
                    <div className="webcontext-section">
                        No token, please apply one below
                        <input type="text" placeholder="API token" onChange={(e) => this.setState({ tokenInput: e.target.value })} />
                        <button onClick={() => this.applyToken()}>Apply token</button>
                        <button onClick={() => this.getToken()}>Get token</button>
                        <button onClick={() => this.getServiceConnections()}>Get service connections</button>
                    </div>
                </div>
            </Page>
        );
    }

    private async loadProjectContext(): Promise<void> {
        try {            
            const client = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
            const context = await client.getProject();
            
            this.setState({ projectContext: context });            

            SDK.notifyLoadSucceeded();
        } catch (error) {
            console.error("Failed to load project context: ", error);
        }
    } 
}

showRootComponent(<BuildResultTab />);