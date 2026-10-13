import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
    region: "ap-south-1",
});

async function main() {
    const response = await client.send(
        new ConverseCommand({
            modelId: "global.amazon.nova-2-lite-v1:0",
            messages: [
                {
                    role: "user",
                    content: [{ text: "Reply with just: Hello from Voxara" }],
                },
            ],
            inferenceConfig: {
                maxTokens: 50,
                temperature: 0.2,
            },
        })
    );

    console.log(response.output.message.content);
}

main().catch((error) => {
    console.error("Bedrock test failed:", error.name, error.message);
});