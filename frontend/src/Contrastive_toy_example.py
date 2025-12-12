import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

class TwoCropTransform:
    def __init__(self, base_transform):
        self.base_transform = base_transform

    def __call__(self, x):
        q = self.base_transform(x)
        k = self.base_transform(x)
        return q, k



transform = TwoCropTransform(
    transforms.Compose([
        transforms.RandomResizedCrop(32),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
    ])
)

train_dataset = datasets.CIFAR10(
    root="./data", train=True, download=True, transform=transform
)
train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True, num_workers=2)

class Encoder(nn.Module):
    def __init__(self, out_dim=128):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 64, 3, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(64, 128, 3, stride=2, padding=1),
            nn.ReLU(),
        )
        self.fc = nn.Linear(128 * 4 * 4, out_dim)

    def forward(self, x):
        h = self.conv(x)
        h = h.view(h.size(0), -1)
        z = self.fc(h)
        return z

class SimCLR(nn.Module):
    def __init__(self, feat_dim=128, proj_dim=64):
        super().__init__()
        self.encoder = Encoder(out_dim=feat_dim)
        self.projector = nn.Sequential(
            nn.Linear(feat_dim, feat_dim),
            nn.ReLU(),
            nn.Linear(feat_dim, proj_dim),
        )

    def forward(self, x):
        h = self.encoder(x)
        z = self.projector(h)
        z = F.normalize(z, dim=1)
        return z

model = SimCLR().cuda()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
temperature = 0.5

def nt_xent_loss(z1, z2, temperature=0.5):
    B = z1.size(0)
    z = torch.cat([z1, z2], dim=0)
    sim = torch.matmul(z, z.T)
    sim = sim / temperature

    mask = torch.eye(2 * B, dtype=torch.bool).cuda()
    sim = sim.masked_fill(mask, -1e9)

    positives = torch.cat([
        torch.arange(B, 2 * B),
        torch.arange(0, B)
    ]).cuda()

    labels = positives
    loss = F.cross_entropy(sim, labels)
    return loss

model.train()
for images, _ in train_loader:
    x1, x2 = images[0].cuda(), images[1].cuda()
    z1 = model(x1)
    z2 = model(x2)

    loss = nt_xent_loss(z1, z2, temperature)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

print("Last loss:", float(loss.item()))